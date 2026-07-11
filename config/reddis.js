import { createClient } from 'redis';

const client = createClient({
    username: 'default',
    password: 'IhJ1s278GAoZibBBtvXSbvQ1xV4GY1T9',
    socket: {
        host: 'redis-11907.c276.us-east-1-2.ec2.redns.redis-cloud.com',
        port: 11907
    }
});

client.on('error', err => console.log('Redis Client Error', err));

await client.connect();

await client.set('foo', 'bar');
const result = await client.get('foo');
console.log(result)  // >>> bar

