import { Config } from '@holochain/try-o-rama'
import * as R from 'ramda'
import { ScenarioApi } from '@holochain/try-o-rama/lib/api'
import { Player } from '@holochain/try-o-rama/lib/player'
import { ConductorConfig } from '@holochain/try-o-rama/lib/types'

const dna = Config.dna('https://github.com/holochain/passthrough-dna/releases/download/v0.0.3/passthrough-dna.dna.json', 'passthrough')

/** Generates a bunch of identical conductor configs with multiple identical instances */
const batchSimple = (numConductors, numInstances) => {
  const conductor = R.pipe(
    R.map(n => [`instance-${n}`, dna]),
    R.fromPairs,
    x => ({ instances: x }),
  )(R.range(0, numInstances))
  return R.repeat(conductor, numConductors)
}

const trace = R.tap(x => console.log('{T}', x))

module.exports = scenario => {

  const N = 10
  const M = 1
  const batch = batchSimple(N, M)

  scenario('one at a time', async (s, t) => {
    const players = R.values(await s.players(batch, true))

    // Make every instance of every conductor commit an entry

    let commitResults = []
    for (const p in players) {
      const player = players[p]
      for (const pair of R.toPairs(player._instances)) {
        const i = pair[0]
        const instance: any = pair[1]
        commitResults.push(await instance.call('main', 'commit_entry', { content: `entry-${p}-${i}` }))
      }
    }
    const hashes = commitResults.map(x => x.Ok)

    // All results are Ok
    t.ok(hashes.every(R.identity))
    t.equal(hashes.length, N * M)

    await s.consistency()

    // Make one instance commit an entry as a base and link every previously committed entry as a target

    const instance1 = await players[0]._instances['instance-0']
    const baseHash = await instance1.call('main', 'commit_entry', { content: 'base' }).then(r => r.Ok)
    let addLinkResults = []
    for (const hash of hashes) {
      const result = await instance1.call('main', 'link_entries', { base: baseHash, target: hash })
      addLinkResults.push(result)
    }

    await s.consistency()

    t.ok(addLinkResults.every(r => r.Ok))
    t.equal(addLinkResults.length, N * M)

    // Make each other instance getLinks on the base hash

    let getLinksResults = []
    for (const p in players) {
      const player = players[p]
      for (const pair of R.toPairs(player._instances)) {
        const i = pair[0]
        const instance: any = pair[1]
        getLinksResults.push(await instance.call('main', 'get_links', { base: baseHash }))
      }
    }

    t.ok(getLinksResults.every(r => r.Ok))
    t.ok(getLinksResults.every(r => r.Ok.links.length === N * M))

  })

  scenario('all at once', async (s, t) => {
    const players = R.values(await s.players(batch, true))
    const commitResults = await R.pipe(
      // Flatten into a 1d array
      R.flatten,
      // Await all in parallel
      x => Promise.all(x),
    )(
      players.map((player, p) =>
        R.values(player._instances).map((instance, i) => {
          return instance.call('main', 'commit_entry', { content: `entry-${p}-${i}` })
        })
      )
    )
    const hashes = commitResults.map(x => x.Ok)

    // All results are Ok
    t.ok(hashes.every(R.identity))
    t.equal(hashes.length, N * M)

    await s.consistency()

    const instance1 = await players[0]._instances['instance-0']
    const baseHash = await instance1.call('main', 'commit_entry', { content: 'base' }).then(r => r.Ok)
    const addLinkResults: Array<any> = await Promise.all(
      hashes.map(hash => instance1.call('main', 'link_entries', { base: baseHash, target: hash }))
    )

    t.ok(addLinkResults.every(r => r.Ok))
    t.equal(addLinkResults.length, N * M)

    await s.consistency()

    const getLinksResults = await R.pipe(
      R.flatten,
      x => Promise.all(x),
    )(
      players.map((player, p) =>
        R.values(player._instances).map((instance, i) => {
          return instance.call('main', 'get_links', { base: baseHash })
        })
      )
    )

    t.ok(getLinksResults.every(r => r.Ok))
    t.ok(getLinksResults.every(r => r.Ok.links.length === N * M))

  })
}