import type { DataDragonEndpointMethods } from '../types';
type BaseURLResolver = string | (() => string | Promise<string>);
export default function dataDragonEndpoints(baseURLOrResolver: BaseURLResolver): DataDragonEndpointMethods;
export {};
