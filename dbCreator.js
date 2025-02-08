// @ts-check
import { fork } from "child_process";
import { spawn } from "child_process";

let n = 1;
let children = [];
let nodePath = process.execPath;

//initial db - no args
const initChild = fork('server.js', [], {
    stdio: 'inherit',  // Keeps I/O connected
    detached: false
});

children.push(initChild);

//wait for child to send first 'dbaddr,multiaddr'
initChild.on('message', (addresses) => {
    // @ts-ignore
    const { dbaddr, multiaddress } = addresses;
    let i;
    for(i = 0; i < n; i++){
        children.push(spawn(nodePath, ['server.js', dbaddr, multiaddress], {
            stdio: 'inherit',  // Keeps I/O connected
            detached: false    // Ties lifecycle to the parent
          }));
    }
});

process.on('SIGINT', () => {
    children.forEach(child => {
        console.log('Mudering innocent children...');
        child.kill('SIGINT'); // Forward SIGINT to child
    });
    process.exit(); // Exit parent
  });

setInterval(() => {}, 1000 * 60 * 60); // Keeps parent alive for 1 hour
