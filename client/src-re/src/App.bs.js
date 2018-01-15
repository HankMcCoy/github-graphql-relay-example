// Generated by BUCKLESCRIPT VERSION 2.1.0, PLEASE EDIT WITH CARE
'use strict';

var Curry                 = require("bs-platform/lib/js/curry.js");
var React                 = require("react");
var ReasonReact           = require("reason-react/src/ReasonReact.js");
var OrgData$ReactTemplate = require("./OrgData.bs.js");

var component = ReasonReact.statelessComponent("Page");

function handleClick(_, _$1) {
  console.log("clicked!");
  return /* () */0;
}

function make() {
  var newrecord = component.slice();
  newrecord[/* didMount */4] = (function () {
      OrgData$ReactTemplate.fetchAll(/* () */0);
      return /* NoUpdate */0;
    });
  newrecord[/* render */9] = (function (self) {
      return React.createElement("div", {
                  onClick: Curry._1(self[/* handle */0], handleClick)
                }, "Hello you!");
    });
  return newrecord;
}

exports.component   = component;
exports.handleClick = handleClick;
exports.make        = make;
/* component Not a pure module */
