// The reads that carry the players' badges (*_v2, 202611010001). A server without them answers the plain read, and the check
// stands: only a missing function falls back, any other failure is that read's failure.
export function badgeReads(rpc) {
  let noBadges = false;
  return async (c, name, args) => {
    if (!noBadges) try { return await rpc(c, `${name}_v2`, args); } catch (error) {
      if (error?.code !== 'PGRST202') throw error;
      noBadges = true;
    }
    return rpc(c, name, args);
  };
}
