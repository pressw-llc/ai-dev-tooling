// Edge Runtime compatible exports
// For use with Next.js Edge Runtime which has limited APIs

export {
  createThreadRouteHandlers,
  createThreadDetailRouteHandlers,
  createCatchAllThreadRouteHandler,
  type ThreadRouteConfig,
} from './route-handlers';

// Note: Server client is not compatible with Edge Runtime
// as it may use Node.js APIs that aren't available in Edge Runtime
export const isEdgeRuntime = true;
