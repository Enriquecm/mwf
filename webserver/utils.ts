declare var global: any;

export function IsDebug(): boolean
{
  return typeof global.v8debug == "object";
}