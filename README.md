# How to call your hApp

> Holochain revision: [v0.0.119 Dec 8, 2021](https://github.com/holochain/holochain/tree/holochain-0.0.119)

> holochain-client-rust revision: [59fc988b50f0097056aa02f11cd1b89a73f1c306  Jan 14, 2022](https://github.com/holochain/holochain-client-rust/commit/59fc988b50f0097056aa02f11cd1b89a73f1c306)

> holochain-client-js version: [0.3.0 Jan 13, 2022](https://www.npmjs.com/package/@holochain/client/v/0.3.0)

> This project is set up as a complementary guide to the ["happ build tutorial"](https://github.com/holochain/happ-build-tutorial/commit/d3f16fe3664b61adc5322a2c48b033743bd87cf8), and interacts with that code via a clean separation at the "network layer". This project calls that project over a network connection, such as Websockets or HTTP, and has no direct dependency on the code itself other than communicating via that connection.

Welcome to this project here to help you make your first network request or "call" to your hApp! If you haven't previously read the article on ["Application Architecture" on the developer documentation](https://developer.holochain.org/concepts/2_application_architecture/) it could be helpful to do so now, or at any point during this tutorial.

A client, such as a GUI or utility script, talks to their hApp using a remote procedure call (RPC) to a “holochain conductor” via a networking interface like an HTTP or Websocket service. The "holochain conductor" has to be running the hApp at the time of the request. If using Websockets the client can also receive “signals” transmitted from the Conductor by subscribing. 

Since a “conductor” can be running many hApps simultaneously when a client makes a request it will have to specify with precision where to route the request. These things are known as a Cell ID, a Zome name, and a function (or fn) name. The request should also:
- pass a "payload" as the input, which should be data encoded/serialized via [msgpack](https://msgpack.org/) as raw bytes
- provide request authorization details

The specific "function" being called is embedded within a “Zome” within a “Cell” (which is within a "hApp"). Here is an example, and then the layers will be walked through one by one.

### Rust Example

This code is runnable and lives within [rust/src/main.rs](./rust/src/main.rs).

```rust
use hdk::prelude::{
    holochain_serial,
    holochain_zome_types::zome::{FunctionName, ZomeName},
    ExternIO, SerializedBytes,
};
use holochain_conductor_api::ZomeCall;
use holochain_conductor_client::AppWebsocket;
use serde::*;

const WS_URL: &str = "ws://localhost:8888";
const H_APP_ID: &str = "test-app";
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
    let app_info_result = app_ws
        .app_info(H_APP_ID.to_string())
        .await
        .or(Err(String::from("Could not get app info")))?;
    let app_info = match app_info_result {
        None => return Err(String::from("no app info found")),
        Some(app_info) => app_info,
    };
    let cell_id = app_info.cell_data[0].as_id().to_owned();

    let payload = ZomeInput { number: 10 };
    // you must encode the payload to standardize it
    // for passing to your hApp
    let encoded_payload = ExternIO::encode(payload.clone())
        .or(Err(String::from("serialization of payload failed")))?;

    // define the context of the request
    let api_request = ZomeCall {
        cell_id: cell_id.clone(),
        zome_name: ZomeName::from(String::from(ZOME_NAME)),
        fn_name: FunctionName::from(String::from(FN_NAME)),
        payload: encoded_payload,
        cap_secret: None,
        provenance: cell_id.clone().agent_pubkey().to_owned(),
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

### TypeScript Example

This code is runnable and lives within [ts/src/app.ts](./ts/src/app.ts).
Note that a difference between this and the Rust code is that the `callZome` function deserializes the output for you, whereas in Rust you have to serialize it yourself before sending it, and deserialize the output from the call as well.

```typescript
import {
  AppWebsocket,
  CallZomeRequest,
} from '@holochain/client';

const WS_URL = 'ws://localhost:8888';
const H_APP_ID = 'test-app';
const ZOME_NAME = 'numbers';
const FN_NAME = 'add_ten';

// custom data we want to pass the hApp
interface ZomeInput {
  number: number;
}

// custom data we want back from the hApp
interface ZomeOutput {
  other_number: number;
}

AppWebsocket.connect(WS_URL).then(
  // connect to the running holochain conductor
  async (appClient) => {
    const appInfo = await appClient.appInfo({ installed_app_id: H_APP_ID });
    if (!appInfo.cell_data[0]) {
      throw new Error('No app info found');
    }

    const cell_id = appInfo.cell_data[0].cell_id;
    const payload: ZomeInput = { number: 10 };
    // define the context of the request
    const apiRequest: CallZomeRequest =
    {
      cap_secret: null,
      cell_id,
      zome_name: ZOME_NAME,
      fn_name: FN_NAME,
      provenance: cell_id[1], // AgentPubKey,
      payload
    };

    try {
      // make the request
      const numbersOutput: ZomeOutput = await appClient.callZome(apiRequest);
      // the result is already deserialized
      console.log('Result of the call:', numbersOutput);
    } catch (error) {
      console.log('Got an error:', error);
    } finally {
      appClient.client.close();
    }
  }
);
```

___
All “hApp”s to which the client can make requests must be hosted and active in a "holochain conductor" running on the same device as the client.

When the conductor receives a request from the client, it will check if the arguments provided match with a hApp that’s currently running in the conductor and route the request to the right component within the right hApp accordingly if so.

In the above example, there are a handful of "magic strings" that we might ask ourselves, "where did that come from?":

#### Rust
```rust
const WS_URL: &str = "ws://localhost:8888";
const H_APP_ID: &str = "test-app";
const ZOME_NAME: &str = "numbers";
const FN_NAME: &str = "add_ten";
```
#### Typescript
```typescript
const WS_URL = 'ws://localhost:8888';
const H_APP_ID = 'test-app';
const ZOME_NAME = 'numbers';
const FN_NAME = 'add_ten';
```

This walkthrough will assume that you have a hApp prepared, and running on a conductor, which you can find instructions on how to do [here](https://github.com/holochain/happ-build-tutorial/tree/happ-client-call-tutorial).

Go through the instructions till you've succesfully run this command:
```bash
hc sandbox generate workdir/happ --run=8888
```

If you are there, you would now be ready to make your first call to a hApp.

___

### First
```rust
const WS_URL: &str = "ws://localhost:8888";
```
```typescript
const WS_URL = 'ws://localhost:8888';
```

The hApp will have to be 1. installed, 2. active, and 3. attached to an “app interface” within the conductor in order for it to be callable over an HTTP or Websocket networking port/interface. The `hc sandbox generate` call generously performed all the actions necessary to meet those criteria, but note that this is not always the case and in many cases it can and should be done more manually (via calls to the "admin interface" of the conductor).

The attachment of a Websocket server to the networking port `8888` was accomplished by passing `--run=8888` during the `hc sandbox generate` call.

___

### Second
```rust
const H_APP_ID: &str = "test-app";
```
```typescript
const H_APP_ID = 'test-app';
```

When you generated the sandbox, the hApp that you specified was installed. By default it is assigned the id `test-app`. You can provide a different id when creating your sandbox:
```bash
hc sandbox generate workdir/happ --app-id another-app-id
```

If you do that, update the H_APP_ID constants in your Rust and TypeScript code accordingly.

___

### Third
```rust
const ZOME_NAME: &str = "numbers";
```
```typescript
const ZOME_NAME = 'numbers';
```

A raw code module is called a Zome (short for chromosome) and defines core business logic. A DNA will have 1 or more Zomes, where each Zome has a given name, for example “chatter”, associated with some raw code.

This name "numbers" should match whatever `name` property was provided to the Zome in the file known as the "Dna Manifest", which you can see the example of [here](https://github.com/holochain/happ-build-tutorial/blob/5ce2d20d5fdb6d9d8aaa8d0ba5beea756a1d6477/workdir/dna/dna.yaml#L7)

```yaml
...
zomes: 
  - name: numbers
    ...
```

___

### Fourth
```rust
const FN_NAME: &str = "add_ten";
```
```typescript
const FN_NAME = 'add_ten';
```

A Zome can expose functions publicly to the Holochain conductor runtime. Some of these functions are invented by the developer, have arbitrary names, and define the Zome’s public API. Others are like [hooks](https://stackoverflow.com/questions/467557/what-is-meant-by-the-term-hook-in-programming) called automatically by Holochain, such as validation functions related to data types defined in the Zome. 

This name "add_ten" should match whatever the name of the exported function is, marked out with the `hdk_extern` flag/modifier in the source code, which is [like this for our example](https://github.com/holochain/happ-build-tutorial/blob/5ce2d20d5fdb6d9d8aaa8d0ba5beea756a1d6477/zomes/numbers/src/lib.rs#L14-L15).
```rust

#[hdk_extern]
pub fn add_ten(input: ZomeInput) -> ExternResult<ZomeOutput> {
    ...
}
```

Note the `add_ten` of course.

## Running the Rust example

If you've followed the instructions and have the "conductor" running, then just navigate in a terminal to the `rust` folder:
```bash
cd rust
```

Once you are there, run:
```bash
cargo run
```

This will compile the code, then execute it, and will take longest the first time you execute the command, and much much shorter the second or later times.

After it runs you should see:
```bash
Result of the call: ZomeOutput {
    other_number: 20,
}
```

You made your first "Zome call", which is shorthand for an API call to your hApp!

## Running the TypeScript example

### App API

Just like in the Rust example, make sure that your "conductor" is running, then just navigate in a terminal to the `ts` folder:
```bash
cd ts
```

Install dependencies by running: 

`npm install`

To run the zome calls to the App API, type:
```bash
npm run app
```

The output will be something along these lines:
```bash
Result of the call: { other_number: 20 }
```

You made your first "Zome call", which is shorthand for an API call to your hApp! If you want to try something out for yourself, you can set `ZOME_NAME` to "whoami", `FN_NAME` to "whoami" and `payload` to `null`.

### Admin API

There's a second command in the `package.json` file, with which you can make a call to the Admin API of the conductor. It will return a list of hashes
of the available DNAs.

The Admin port is different each time you generate the holochain sandbox. Therefore you need to copy it first from your hApp.
```bash
...

Conductor ready.
hc-sandbox: Running conductor on admin port _49590_
hc-sandbox: Attaching app port 8888
hc-sandbox: App port attached at 8888
hc-sandbox: Connected successfully to a running holochain
```

and paste it as the port in file `ts/admin.ts`
```typescript
const ADMIN_PORT = 49590;
```

Now you can run the call:
```bash
npm run admin
```

You should see
```bash
DNAs [ 'uhC0kHvFAj/TiqlX2aS6ZyMQLYshDozOl2y+QgOw2GVVSiyDYIWwr' ]
```

Brilliant! Now you can make calls to both Admin and App API with TypeScript!
