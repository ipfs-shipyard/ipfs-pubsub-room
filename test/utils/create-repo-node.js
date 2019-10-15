'use strict'

const IPFSRepo = require('ipfs-repo')
const clean = require('./clean')

function createTempRepo () {
  const repoPath = '/tmp/ipfs-test-' + Math.random().toString().substring(2, 8)
  let destroyed = false

  const repo = new IPFSRepo(repoPath)

  repo.teardown = async () => {
    if (destroyed) {
      return
    }
    destroyed = true

    try {
      await repo.close()
    } catch (err) {
      // ignore err, might have been closed already
    }

    clean(repoPath)
  }

  return repo
}

module.exports = createTempRepo
