const express = require('express')
const { graphqlHTTP } = require('express-graphql')
const { WebSocketServer } = require('ws')
const { useServer } = require('graphql-ws/lib/use/ws')
var cors = require('cors')
// const { execute, subscribe } = require('graphql')

var whitelist = ['https://192.168.1.127:3002', 'http://127.0.0.1:3002', 'http://localhost:4000']
var corsOptions = {
    origin: function (origin, callback) {
        console.log(origin)
        if (whitelist.indexOf(origin) !== -1) {
            callback(null, true)
        } else {
            callback(new Error('Not allowed by CORS'))
        }
    }
}

const app = express()
app.use(cors(corsOptions))

const schema = require('./schema')

app.get('/', (req, res) => res.send('GraphQL Server is running'))

app.use('/graphql', graphqlHTTP(req => ({
    schema,
    graphiql: {
        headerEditorEnabled: true
    }
})))

const server = app.listen(4000, () => {
    console.log(`GraphQL Server running on http://localhost:4000/graphql`)
    const wss = new WebSocketServer({ server, path: '/subscriptions' })
    // useServer({ schema }, wss)
    useServer(
        {
            schema,
            // execute,
            // subscribe,
            onConnect: (ctx) => {
                if (ctx.connectionParams?.token !== 'some-token') {
                    console.log('Access denied')
                    return false
                }
            },
            onSubscribe: (ctx, msg) => {
                console.log('Subscribe')
            },
            onNext: (ctx, msg, args, result) => {
                console.debug('Next')
            },
            onError: (ctx, msg, errors) => {
                console.error(errors)
            },
            onComplete: (ctx, msg) => {
                console.log('Complete')
            },
        },
        wss
    )
    console.log(`WebSockets listening on ws://localhost:4000/subscriptions`)
    // server.on('upgrade', async function (req, socket, head) {
    //     console.log('UPGRADING')
    //     const allowed = true
    //     if (!allowed) {
    //         socket.write('HTTP/1.1 401 Web Socket Protocol Handshake\r\n' +
    //             'Upgrade: WebSocket\r\n' +
    //             'Connection: Upgrade\r\n' +
    //             '\r\n')
    //         // socket.close();
    //         socket.destroy()
    //     }
    //     wss.handleUpgrade(req, socket, head, function done(ws) {
    //         wss.emit('connection', ws, req)
    //     })
    // })
})

