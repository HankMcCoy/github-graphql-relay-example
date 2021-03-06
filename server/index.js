const express = require('express')
const _ = require('lodash')
const path = require('path')
const app = express()
const MongoClient = require('mongodb').MongoClient

const mongoConnectionStr = 'mongodb://localhost:27017/gh-dash'

let db

const getSortedDistinct = attr => {
  return db
    .collection('pullRequests')
    .distinct(attr)
    .then(values => values.filter(x => x).sort(caseInsensitiveCompare))
}

const filterByRepo = (query, repo) => {
  return repo ?
    {
      ...query,
      repo,
    } :
    query
}

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../client/index.html'))
})

app.use('/js', express.static(path.join(__dirname, '../client/js')))

app.get('/api/orgs', (req, res) => {
  getSortedDistinct('org').then(orgs => res.send({ orgs }))
})

app.get('/api/repos', (req, res) => {
  getSortedDistinct('repo').then(repos => res.send({ repos }))
})

app.get('/api/pull-requests', (req, res) => {
  const { org, repo } = req.query

  const mongoQuery = filterByRepo({
    dateClosed: null,
    org,
  }, repo)

  db
    .collection('pullRequests')
    .find(mongoQuery)
    .toArray((err, prs) => {
      res.send({ pullRequests: prs })
    })
})

app.get('/api/author-leader-board', (req, res) => {
  const { org, repo, startDate } = req.query

  getLeaderBoard({ type: 'author', org, repo, startDate }).then(results =>
    res.send({ results })
  )
})

app.get('/api/reviewer-leader-board', (req, res) => {
  const { org, repo, startDate } = req.query

  getLeaderBoard({ type: 'gtgReviewer', org, repo, startDate }).then(results =>
    res.send({ results })
  )
})

const getLeaderBoard = ({ type, org, repo, startDate }) => {
  const matchQuery = filterByRepo({
    dateMerged: { $gt: new Date(startDate) },
    org,
  }, repo)

  return new Promise((resolve, reject) => {
    db
      .collection('pullRequests')
      .aggregate([
        {
          $match: matchQuery,
        },
        {
          $addFields: {
            loc: { $add: ['$additions', '$deletions'] },
          },
        },
        {
          $group: {
            _id: '$' + type,
            count: { $sum: 1 },
            totalLoc: { $sum: '$loc' },
            totalRevisions: { $sum: '$numRevisions' },
            locs: { $push: '$loc' },
          },
        },
      ])
      .toArray((err, results) => {
        console.log({ results })
        if (err) {
          return reject(err)
        }
        const processedResults = results.map(r => {
          const locs = _.sortBy(r.locs)
          return {
            [type]: r._id || 'Unknown',
            count: r.count,
            avgLoc: r.totalLoc / r.count,
            minLoc: locs[0],
            medianLoc: locs[Math.floor(locs.length / 2)],
            maxLoc: locs[locs.length - 1],
            totalLoc: r.totalLoc,
            avgRevisions: r.totalRevisions / r.count,
          }
        })

        resolve(processedResults)
      })
  })
}

app.get('/api/review-times', (req, res) => {
  const { org, repo, startDate } = req.query

  const matchQuery = filterByRepo({
    dateMerged: { $gt: new Date(startDate) },
    org,
  }, repo)

  db
    .collection('pullRequests')
    .aggregate([
      {
        $match: matchQuery,
      },
      {
        $group: {
          _id: { $week: '$dateMerged' },
          spentInReview: {
            $avg: '$times.spentInReview',
          },
          waitingForReview: {
            $avg: '$times.waitingForReview',
          },
          afterReviewBeforeMerge: {
            $avg: '$times.afterReviewBeforeMerge',
          },
        },
      },
    ])
    .toArray((err, results) => {
      if (err) {
        res.send(err)
      } else {
        res.send({ reviewTimes: results })
      }
    })
})

app.get('/api/revisions-by-author/:author', (req, res) => {
  const { author } = req.params
  const { org, repo, startDate } = req.query

  db
    .collection('pullRequests')
    .aggregate([
      {
        $match: filterByRepo({
          author,
          gtgReviewer: { $ne: null },
          dateMerged: { $gt: new Date(startDate) },
          org,
        }, repo),
      },
      {
        $group: {
          _id: '$gtgReviewer',
          numRevisions: { $sum: '$numRevisions' },
          count: { $sum: 1 },
        },
      },
    ])
    .toArray((err, results) => {
      if (err) {
        res.send(err)
      } else {
        res.send({ revisionCounts: results.sort(compareByAttr('_id')) })
      }
    })
})

app.get('/api/revisions-by-reviewer/:reviewer', (req, res) => {
  const { reviewer } = req.params
  const { org, repo, startDate } = req.query

  db
    .collection('pullRequests')
    .aggregate([
      {
        $match: filterByRepo({
          gtgReviewer: reviewer,
          dateMerged: { $gt: new Date(startDate) },
          org,
        }, repo),
      },
      {
        $group: {
          _id: '$author',
          numRevisions: { $sum: '$numRevisions' },
          count: { $sum: 1 },
        },
      },
    ])
    .toArray((err, results) => {
      if (err) {
        res.send(err)
      } else {
        res.send({ revisionCounts: results.sort(compareByAttr('_id')) })
      }
    })
})

const compareByAttr = attr => (a, b) => caseInsensitiveCompare(a[attr], b[attr])
const caseInsensitiveCompare = (a, b) => {
  if (a.toLowerCase() < b.toLowerCase()) {
    return -1
  } else if (a.toLowerCase() > b.toLowerCase()) {
    return 1
  }
  return 0
}

app.get('/api/reviewers', (req, res) => {
  getSortedDistinct('gtgReviewer').then(reviewers => res.send({ reviewers }))
})

app.get('/api/authors', (req, res) => {
  getSortedDistinct('author').then(authors => res.send({ authors }))
})

MongoClient.connect(mongoConnectionStr).then(
  dbConnection => {
    console.log('Connected to Mongo')
    db = dbConnection
    app.listen(3000, () => {
      console.log('Server started')
    })
  },
  err => {
    console.error(err)
  }
)
