import { JungleBusClient } from '@gorillapool/js-junglebus'
import chalk from 'chalk'
import { fork } from 'child_process'
import net from 'net'
import redline from 'readline'
import { crawler, setCurrentBlock } from './crawler.js'
import { closeDb, getDbo } from './db.js'
import { ensureEnvVars } from './env.js'
import { getCurrentBlock } from './state.js'

/* Bitsocket runs in a child process */

// const bitsocket = fork('./build/bitsocket')

/* Planarium (API Server Process) */
const api = fork('./build/api')

export const enum ConnectionStatus {
  Connecting = 0,
  Connected,
  Disconnected,
  Error,
}
export var socket: net.Socket

let connectionStatus = ConnectionStatus.Disconnected

// Open up the server and send RPC socket to child. Use pauseOnConnect to prevent
// the sockets from being read before they are sent to the child process.
// const server = net.createServer({ pauseOnConnect: true })
// server.on('connection', (s) => {
// api.send({ type: 'socket', socket: s })
// socket = s

// process.on('message', (data: any) => {
//   console.log('message received by parent!', data)
//   switch (data.type) {
//     case '':
//     case 'tx':
//       try {
//         processTransaction(data.rawTx)
//       } catch (e) {
//         console.error('Failed to ingest tx', e)
//       }
//       break
//   }
// })
// })

// server.listen(1336)

const start = async () => {
  await ensureEnvVars()
  await getDbo() // warm up db connection
  console.log('WARM')
  try {
    // Should really start with latest blk from ANY collection, not only video like this
    let currentBlock = await getCurrentBlock()
    setCurrentBlock(currentBlock)
    console.log(chalk.cyan('crawling from', currentBlock))

    const s = 'junglebus.gorillapool.io'
    console.log('CRAWLING', s)
    const jungleBusClient = new JungleBusClient(s, {
      debug: true,
      protocol: 'protobuf',
      onConnected(ctx) {
        // add your own code here
        connectionStatus = ConnectionStatus.Connected
        api.send({ status: connectionStatus, type: 'status' })
        console.log(ctx)
      },
      onConnecting(ctx) {
        // add your own code here
        connectionStatus = ConnectionStatus.Connecting
        api.send({ status: connectionStatus, type: 'status' })
        console.log(ctx)
      },
      onDisconnected(ctx) {
        // add your own code here
        connectionStatus = ConnectionStatus.Disconnected
        api.send({ status: connectionStatus, type: 'status' })
        console.log(ctx)
      },
      onError(ctx) {
        // add your own code here
        console.error(ctx)
        connectionStatus = ConnectionStatus.Error
        api.send({ status: connectionStatus, type: 'status' })
        // reject(ctx)
      },
    })

    await crawler(jungleBusClient)
  } catch (e) {
    console.error(e)
  }
}

// Handle interrupt
if (process.platform === 'win32') {
  let rl = redline.createInterface({
    input: process.stdin,
    output: process.stdout,
  })

  rl.on('SIGINT', function () {
    // ToDo - TS hates this
    // process.emit('SIGINT')
  })
}

process.on('SIGINT', async function () {
  // graceful shutdown
  console.log('close from shutdown')
  await closeDb()
  // server.close()
  process.exit()
})

console.log(
  chalk.yellow(`
:::::::::  ::::    ::::      :::     :::::::::  
  :+:    :+: +:+:+: :+:+:+   :+: :+:   :+:    :+: 
  +:+    +:+ +:+ +:+:+ +:+  +:+   +:+  +:+    +:+ 
  +#++:++#+  +#+  +:+  +#+ +#++:++#++: +#++:++#+  
  +#+    +#+ +#+       +#+ +#+     +#+ +#+        
  #+#    #+# #+#       #+# #+#     #+# #+#        
  #########  ###       ### ###     ### ###
`)
)

setTimeout(start, 1000)
