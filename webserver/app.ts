/// <reference path='../typings/node/node.d.ts' />

/* Namespaces
 * ----------------------------------------------------- */
import WS = require("./libs/webserver");

/* Facilities
 * ----------------------------------------------------- */
var ResponseStatus = WS.ResponseStatus;

/* Application business logic
 * ----------------------------------------------------- */
export function SignIn(params: WS.IAppParams, cb: WS.IAppCallback)
{
  console.log(params);
  cb(ResponseStatus.Success, "SignIn Content");
}

export function SignOut(params: WS.IAppParams, cb: WS.IAppCallback)
{
  console.log(params);
  cb(ResponseStatus.Success, "SignOut Content");
}