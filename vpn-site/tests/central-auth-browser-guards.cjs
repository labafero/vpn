const localHosts = new Set(['localhost', '127.0.0.1', '::1', '[::1]'])

function assertLocalBrowserTargets(apps) {
  const urls = Object.values(apps)
  const hosts = new Set(urls.map((url) => url.hostname))
  const allLocalHttp = urls.every(
    (url) =>
      url.protocol === 'http:' && localHosts.has(url.hostname) && !url.username && !url.password
  )

  if (urls.length !== 3 || !allLocalHttp || hosts.size !== 1) {
    throw new Error('Central auth browser test app URLs must use the same local hostname.')
  }
}

module.exports = { assertLocalBrowserTargets }
