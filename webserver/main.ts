/// <reference path='../typings/node/node.d.ts' />

import nsWS = require("./libs/webserver/webserver");
import nsPath = require("path");
import nsUtils = require("./libs/utils");

var ParamSource = nsWS.ParamSource;
var ParamType = nsWS.ParamType;

var config = new nsWS.WebServerConfig();

config.port    = 8080;
config.root    = nsPath.join(__dirname, "..", "webclient");
config.index   = (nsUtils.IsDebug() ? "/src/" : "/min/") + "html/index.html";
config.favicon = "/assets/favicon.ico";

config.defaultParamSource = ParamSource.PLAYLOAD;

config.statics = [{path: "/assets/"}];

if (nsUtils.IsDebug())
{
  config.statics.push({path: "/src/css/", virtual: "/css/"});
  config.statics.push({path: "/src/html/", virtual: "/"});
  config.statics.push({path: "/src/js/", virtual: "/js/"});
}
else
{
  config.statics.push({path: "/min/css/", virtual: "/css/"});
  config.statics.push({path: "/min/html/", virtual: "/"});
  config.statics.push({path: "/min/js/", virtual: "/js/"});
}

config.routes = [
  {
    url: "/api/signin",
    params: [
      {
        name: "encryption",
        type: ParamType.String,
        required: true,
        source: ParamSource.COOKIE}
    ],
    callback: function(){}
  }
];

var websrv = new nsWS.WebServer(config);
websrv.listen();