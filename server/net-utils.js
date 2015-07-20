function respondWith204(res) {
  return function () {
    // workaround for Firefox' bug https://bugzilla.mozilla.org/show_bug.cgi?id=521301
    res.setHeader('content-type', 'application/javascript')
    res.status(204).end()
  }
}

module.exports = {
  respondWith204: respondWith204
}
