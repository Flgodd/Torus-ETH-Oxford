// @ts-check
import { spawn } from "child_process";
import { execSync } from "child_process";

let children = [];
const PORT = 3001;
const NUM_REPLICAS = parseInt(process.argv[2]) || 1;;
const STATIC_ROOT_IP = "192.168.1.100"
const NETWORK_NAME = "orbitdb-net";

try {
    execSync(`docker network create --subnet=192.168.1.0/24 ${NETWORK_NAME}`);
    console.log("Docker network created.");
} catch (err) {
    console.log("Network may already exist, continuing...");
}

console.log("stopping any existing containers");

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
    'run', '--rm',
    '-p', `${PORT}:3000`,//map to port 3000 which we hardcode below as the port to listen on inside of the container
    '--network', NETWORK_NAME,
    '--ip', STATIC_ROOT_IP, // Set static IP
    '-e', `PORT=3000`,
    '-e', `NUM_REPLICAS=${NUM_REPLICAS}`,
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
        console.log("spawning child on port: ", PORT+i, " access thru localhost\n")

        children.push(
            spawn('docker', [
                'run', '--rm',
                '--network', NETWORK_NAME,
                '-p', `${PORT+i}:3000`,//map to port 3000 which we hardcode below
                '-e', `PORT=3000`,
                '-e', `REPLICA=yes`,
                '-e', `DBADDR=${dbaddr}`,
                '-e', `MULTIADDR=${multiaddress}`,
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
