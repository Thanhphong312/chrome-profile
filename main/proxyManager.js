const ProxyChain = require('proxy-chain')

// profileId -> local proxy URL
const activeProxies = new Map()

/**
 * Returns a proxy URL suitable for Chrome's --proxy-server flag.
 * If the profile has credentials, wraps the upstream via proxy-chain
 * to produce an unauthenticated local proxy (Chrome can't pass auth flags).
 */
async function prepareProxy(profile) {
  const { proxy_type, proxy_host, proxy_port, proxy_user, proxy_pass, id } = profile
  const scheme = proxy_type.toLowerCase()

  if (proxy_user && proxy_pass) {
    const upstreamUrl = `${scheme}://${encodeURIComponent(proxy_user)}:${encodeURIComponent(proxy_pass)}@${proxy_host}:${proxy_port}`
    const localUrl = await ProxyChain.anonymizeProxy(upstreamUrl)
    activeProxies.set(id, localUrl)
    return localUrl
  }

  return `${scheme}://${proxy_host}:${proxy_port}`
}

async function closeProxy(profileId) {
  const localUrl = activeProxies.get(profileId)
  if (localUrl) {
    try {
      await ProxyChain.closeAnonymizedProxy(localUrl, true)
    } catch (e) {
      console.error('Error closing proxy:', e.message)
    }
    activeProxies.delete(profileId)
  }
}

module.exports = { prepareProxy, closeProxy }
