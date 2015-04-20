/// <reference path='../typings/node/node.d.ts' />

/* Namespaces
 * ----------------------------------------------------- */
import nsWS    = require("./libs/webserver/webserver");
import nsPath  = require("path");
import nsUtils = require("./libs/utils");

/* Facilities
 * ----------------------------------------------------- */
var ParamSource = nsWS.ParamSource;
var ParamType   = nsWS.ParamType;

/* Initial WebServer configuration
 * ----------------------------------------------------- */
var config = new nsWS.WebServerConfig();

config.port    = 8080;
config.root    = nsPath.join(__dirname, "..", "webclient");
config.index   = (nsUtils.IsDebug() ? "/src/" : "/min/") + "html/index.html";
config.favicon = "/assets/favicon.ico";

config.defaultParamSource = ParamSource.PLAYLOAD;

/* Static routes
 * ----------------------------------------------------- */
var statics: nsWS.IStaticRoute[] = [];
statics.push({path: "/assets/"});

if (nsUtils.IsDebug())
{
  statics.push({path: "/src/css/", virtual: "/css/"});
  statics.push({path: "/src/html/", virtual: "/"});
  statics.push({path: "/src/js/", virtual: "/js/"});
}
else
{
  statics.push({path: "/min/css/", virtual: "/css/"});
  statics.push({path: "/min/html/", virtual: "/"});
  statics.push({path: "/min/js/", virtual: "/js/"});
}
config.statics = statics;

/* Callback routes
 * ----------------------------------------------------- */
var routes: nsWS.ICallbackRoute[] = [
  {
    url: "/api/signin",
    params: [
      {
        name: "encryption",
        type: ParamType.String,
        required: true,
        source: ParamSource.COOKIE
      }
    ],
    callback: function(connection) {
      console.log(connection);
    }
  }
];
config.routes = routes;

/* Apply configuration and start listening
 * ----------------------------------------------------- */
var websrv = new nsWS.WebServer(config);
websrv.listen();