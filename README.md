# How to call your hApp

> Holochain revision: [753ea0873cd6e4c7b3ba30ead2d815d5f61b5373 Jun 4, 2021](https://github.com/holochain/holochain/commits/753ea0873cd6e4c7b3ba30ead2d815d5f61b5373)

This project is set up as a complementary guide to the ["happ build tutorial"](https://github.com/holochain/happ-build-tutorial/tree/happ-client-call-tutorial), and interacts with that code via a clean separation at the "network layer". This project calls that project over a network connection, such as Websockets or HTTP, and has no direct dependency on the code itself other than communicating via that connection.

A client, such as a GUI or utility script, talks to their hApp using a remote procedure call (RPC) to a “holochain conductor” via a networking interface like an HTTP or Websocket service. The "holochain conductor" has to be running the hApp at the time of the request. If using Websockets the client can also receive “signals” transmitted from the Conductor by subscribing. 

Since a “conductor” can be running many hApps simultaneously when a client makes a request it will have to specify with precision where to route the request. It has to pass things known as a Cell ID, a Zome name, and a function name, along with the actual input payload.

The specific "function" being called is embedded within a “Zome” within a “Cell” (which is within a "hApp"). Here is an example, and then the layers will be walked through one by one.

### Rust Example

This code is runnable and lives within [src/main.rs](./src/main.rs).

```rust
use hdk::prelude::{
    holo_hash::{
        hash_type::{Agent, Dna},
        HoloHashB64,
    },
    holochain_serial,
    holochain_zome_types::zome::{FunctionName, ZomeName},
    CellId, ExternIO, SerializedBytes,
};
use holochain_conductor_api::ZomeCall;
use holochain_conductor_api_rust::AppWebsocket;
use serde::*;

const WS_URL: &str = "ws://localhost:8888";
const DNA_HASH: &str = "uhC0kr_aK3yRD4rCHsxdPr56Vm60ZwV9gltDOzlHa2ZCx_PYlUC07";
const AGENT_PUB_KEY: &str = "uhCAkaHxxzngUd7u7SoDPL7FSJFqISI7mFjpUkC8zov8p02nl-pAC";
const ZOME_NAME: &str = "numbers";
const FN_NAME: &str = "add_ten";

// data we want to pass holochain
#[derive(Serialize, Deserialize, SerializedBytes, Debug, Clone)]
struct ZomeInput {
    number: i32,
}

// data we want back from holochain
#[derive(Serialize, Deserialize, SerializedBytes, Debug, Clone)]
pub struct ZomeOutput {
    other_number: i32,
}

pub async fn call() -> Result<ZomeOutput, String> {
    // connect to a running holochain conductor
    // (there needs to be a running holochain conductor!)
    let mut app_ws = AppWebsocket::connect(WS_URL.to_string())
        .await
        .or(Err(String::from("Could not connect to conductor")))?;

    let payload = ZomeInput { number: 10 };
    // you must encode the payload to standardize it
    // for passing to your hApp
    let encoded_payload =
        ExternIO::encode(payload.clone()).or(Err(String::from("serialization of payload failed")))?;

    let dna_hash =
        HoloHashB64::<Dna>::from_b64_str(DNA_HASH)
            .or(Err(String::from("deserializing dna_hash failed")))?;
    let agent_pub_key =
        HoloHashB64::<Agent>::from_b64_str(AGENT_PUB_KEY)
            .or(Err(String::from("deserializing agent_pub_key failed")))?;
    let cell_id = CellId::new(dna_hash.into(), agent_pub_key.clone().into());
    // define the context of the request
    let api_request = ZomeCall {
        cell_id: cell_id,
        zome_name: ZomeName::from(String::from(ZOME_NAME)),
        fn_name: FunctionName::from(String::from(FN_NAME)),
        payload: encoded_payload,
        cap: None,
        provenance: agent_pub_key.into(),
    };

    // make the request
    let encoded_api_response = app_ws
        .zome_call(api_request)
        .await
        .map_err(|e| {
            println!("{:?}", e);
            e
        })
        .or(Err(String::from("zome call failed")))?;

    // you must decode the payload from
    // the standarized format its returned as
    // let result: ZomeOutput = encoded_api_response
    let result: ZomeOutput = encoded_api_response
        .decode()
        .or(Err(String::from("deserialization failed")))?;

    Ok(result)
}

#[tokio::main]
async fn main() {
    match call().await {
        Ok(s) => println!("Result of the call: {:#?}", s),
        Err(e) => println!("Got an error: {:?}", e),
    };
}
```

Typescript 
// TODO: the same thing but in typescript with holochain-conductor-api
```typescript

```

___
All “hApp”s to which the client can make requests must be hosted and active in a "holochain conductor" running on the same device as the client.

When the conductor receives a request from the client, it will check if the arguments provided match with a hApp that’s currently running in the conductor and route the request to the right component within the right hApp accordingly if so.

In the above example, there are a handful of "magic strings" that we might ask ourselves, "where did that come from?":
```rust
const WS_URL: &str = "ws://localhost:8888";
const DNA_HASH: &str = "uhC0kr_aK3yRD4rCHsxdPr56Vm60ZwV9gltDOzlHa2ZCx_PYlUC07";
const AGENT_PUB_KEY: &str = "uhCAkaHxxzngUd7u7SoDPL7FSJFqISI7mFjpUkC8zov8p02nl-pAC";
const ZOME_NAME: &str = "numbers";
const FN_NAME: &str = "add_ten";
```

This walkthrough will assume that you have a hApp prepared, and running on a conductor, which you can find instructions on how to do [here](https://github.com/holochain/happ-build-tutorial/tree/happ-client-call-tutorial).

Go through the instructions till you get to this command:
```bash
hc sandbox generate workdir/happ --run=8888
```

If you are there, you would now be ready to make your first call to a hApp.

___

### First
```rust
const WS_URL: &str = "ws://localhost:8888";
```

The hApp will have to be actively attached to an “app interface” within the conductor in order for it to be callable over an HTTP or Websocket networking port/interface. 

This was accomplished by passing `--run=8888` during the `hc sandbox generate` call.

___

### Second
```rust
const DNA_HASH: &str = "uhC0kr_aK3yRD4rCHsxdPr56Vm60ZwV9gltDOzlHa2ZCx_PYlUC07";
const AGENT_PUB_KEY: &str = "uhCAkaHxxzngUd7u7SoDPL7FSJFqISI7mFjpUkC8zov8p02nl-pAC";
```

Things known as Cells occupy slots in a hApp. When a client makes a request to a hApp through a conductor, it will have to specify which “slot” in the hApp it is calling into, which is accomplished by passing the ID of the “Cell” which occupies the slot. A Cell ID is a pairing of the hash that identifies the "DNA", and the public key which represents the agent.

In another terminal, you can find the values to provide the "Cell ID", which are the `dna_hash` and the `agent_pub_key`.
```bash
$ hc sandbox call 0 list-cells
# hc-sandbox: Cell Ids: [CellId(DnaHash(uhC0kvRCGdnEW7-69nvczqYcXjpagbqilxeDw6mcLyEV9zscrxDPb), AgentPubKey(uhCAkZ-UqvaRMcBbLNuec8qT16YYLglkrluYQ3uDFn_iKVzP34IDa))]
```

Take the value inside `DnaHash(...)` and replace the value of `DNA_HASH` in the code with it. Take the value inside `AgentPubKey(...)` and replace the value of `AGENT_PUB_KEY` in the code with it.

A bundle of properties and source code for a unit of a hApp is called a DNA. Apart from the section of the bundle that is ‘properties’ or metadata, the DNA is made up of submodules in which the actual functions are written into code, known as Zomes. 

> Due to the properties of cryptographic hashing, even the slightest alteration in this bundle either in the code or in the properties will change the hash, and thus form an entirely separate peer-to-peer network than the unaltered version. Thus defining a DNA must be done with great precision.

___

### Third
```rust
const ZOME_NAME: &str = "numbers";
```

A raw code module is called a Zome (short for chromosome) and defines core business logic. A DNA will have 1 or more Zomes, where each Zome has a given name, for example “chatter”, associated with some raw code.

TODO: where is this defined, where does it come from?

___

### Fourth
```rust
const FN_NAME: &str = "add_ten";
```

A Zome can expose functions publicly to the Holochain conductor runtime. Some of these functions are like ‘hooks’ called automatically by Holochain, such as validation functions related to data types defined in the Zome. Other functions are invented by the developer, have arbitrary names, and define the Zome’s public API.

TODO: where is this defined, where does it come from?

## Running It

If you've followed the instructions and have the "conductor" running, then just navigate in a terminal to this folder (and have Rust installed) and run `cargo run`.

You should see:
```bash
Result of the call: ZomeOutput {
    other_number: 20,
}
```