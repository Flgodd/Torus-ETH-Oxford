// @ts-check
import { spawn } from "child_process";
import { execSync } from "child_process";
import dotenv from 'dotenv';
dotenv.config();

let children = [];
const MAP_PORT = 3001;
const NUM_REPLICAS = parseInt(process.argv[2]) || 1;
const STATIC_ROOT_IP = "192.168.1.100"
const NETWORK_NAME = "orbitdb-net";

try {
    execSync(`docker network create --subnet=192.168.1.0/24 ${NETWORK_NAME}`);
    console.log("Docker network created.");
} catch (err) {
    console.log("Network may already exist, continuing...");
}

console.log("Stopping any existing containers");

try {
    execSync('docker stop $(docker ps -q)');
} catch (err) {
    console.log("Container may already be stopped, continuing...");
}

console.log("building containurrr");

try {
    execSync(`docker build -t dbservice ./organelle`);
    console.log("Docker image created.");
} catch (err) {
    console.log("Image may already exist, continuing...");
}

//initial db - no args
const initChild = spawn('docker', [
    '--debug',
    'run', '--rm',
    '-p', `${MAP_PORT}:${process.env.PORT}`,//map to port 3000 which we hardcode below as the port to listen on inside of the container
    '--network', NETWORK_NAME,
    '--ip', STATIC_ROOT_IP, // Set static IP
    '-e', `MAP_PORT=${MAP_PORT}`,
    '-e', `NUM_REPLICAS=${NUM_REPLICAS}`,
    '-e', `NODE_NUMBER=${0}`,
    '--name', 'dbservice', 'dbservice'
]
);
children.push(initChild);

//wait for child to send first 'dbaddr,multiaddr'
initChild.stdout.on('data', (data) => {
    let parsed
    try {
        parsed = JSON.parse(data.toString().trim());
        console.log("Received Object:", parsed);
    } catch (error) {
        console.error("Not JSON: ", data.toString());
        return;
    }

    // @ts-ignore
    const { dbaddr, multiaddress } = parsed;

    let i;
    for(i = 1; i < NUM_REPLICAS + 1; i++){
        console.log("spawning child on port: ", MAP_PORT+i, " access thru localhost\n")

        children.push(
            spawn('docker', [
                '--debug',
                'run', '--rm',
                '--network', NETWORK_NAME,
                '-p', `${MAP_PORT+i}:${process.env.PORT}`,//map to port 3000 which we hardcode below
                '-e', `MAP_PORT=${MAP_PORT+i}`,
                '-e', `REPLICA=yes`,
                '-e', `DBADDR=${dbaddr}`,
                '-e', `MULTIADDR=${multiaddress}`,
                '-e', `NODE_NUMBER=${i}`,
                '--name', `CHILDDB${i}`, 'dbservice'
            ],{
                stdio: 'inherit' // This makes stdout and stderr go straight to the terminal
            })
        );
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
