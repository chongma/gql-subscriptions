const express = require('express')
const { graphqlHTTP } = require('express-graphql')
const { WebSocketServer } = require('ws')
const { useServer } = require('graphql-ws/lib/use/ws')
// const { execute, subscribe } = require('graphql')
// const expressPlayground = require('graphql-playground-middleware-express').default

const app = express()
const schema = require('./schema')

app.get('/', (req, res) => res.send('GraphQL Server is running'))

app.use('/graphql', graphqlHTTP(req => ({
    schema,
    graphiql: {
        headerEditorEnabled: true
    }
})))

// app.get('/playground', expressPlayground({ endpoint: '/graphql' }))

const server = app.listen(4000, () => {
    console.log(`GraphQL Server running on http://localhost:4000/graphql`)
    const wss = new WebSocketServer({ noServer: true, path: '/subscriptions' })
    // useServer({ schema }, wss)
    useServer(
        {
            schema,
            // execute,
            // subscribe,
            onConnect: (ctx) => {
                console.log('Connect');
            },
            onSubscribe: (ctx, msg) => {
                console.log('Subscribe');
            },
            onNext: (ctx, msg, args, result) => {
                console.debug('Next');
            },
            onError: (ctx, msg, errors) => {
                console.error(errors);
            },
            onComplete: (ctx, msg) => {
                console.log('Complete');
            },
        },
        wss
    )
    console.log(`WebSockets listening on ws://localhost:4000/subscriptions`)
    server.on('upgrade', async function (req, socket, head) {
        console.log('UPGRADING')
        const allowed = true
        if (!allowed) {
            socket.write('HTTP/1.1 401 Web Socket Protocol Handshake\r\n' +
                'Upgrade: WebSocket\r\n' +
                'Connection: Upgrade\r\n' +
                '\r\n')
            // socket.close();
            socket.destroy()
        }
        wss.handleUpgrade(req, socket, head, function done(ws) {
            wss.emit('connection', ws, req)
        })
    })
})

