// Generated by BUCKLESCRIPT VERSION 2.1.0, PLEASE EDIT WITH CARE
'use strict';

var Json_decode = require("bs-json/src/Json_decode.js");

function parse_org_list(json) {
  return /* record */[/* orgs */Json_decode.field("orgs", (function (param) {
                  return Json_decode.list(Json_decode.string, param);
                }), json)];
}

function fetchAll() {
  return fetch("http://localhost:3000/api/orgs").then((function (prim) {
                    return prim.json();
                  })).then((function (json) {
                  return Promise.resolve(parse_org_list(json));
                })).then((function (org_list) {
                return Promise.resolve(org_list[/* orgs */0]);
              }));
}

exports.fetchAll = fetchAll;
/* No side effect */