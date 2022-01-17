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
use holochain_conductor_client::AppWebsocket;
use serde::*;

const WS_URL: &str = "ws://localhost:8888";
// replace this, based on the DnaHash portion of the output of `hc sandbox call 0 list-cells`
const DNA_HASH: &str = "uhC0kaiJKjACG1NunHwWUTXr3RER72PkxT62W4GNa3qOuwJWe1gUQ";
// replace this, based on the AgentPubKey portion of the output of `hc sandbox call 0 list-cells`
const AGENT_PUB_KEY: &str = "uhCAkPXiK-DI-fY9erjy68FFQn7L4eyjtjkRH51r8URPFFUX6JLpM";
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
    let encoded_payload = ExternIO::encode(payload.clone())
        .or(Err(String::from("serialization of payload failed")))?;

    let dna_hash = HoloHashB64::<Dna>::from_b64_str(DNA_HASH)
        .or(Err(String::from("deserializing dna_hash failed")))?;
    let agent_pub_key = HoloHashB64::<Agent>::from_b64_str(AGENT_PUB_KEY)
        .or(Err(String::from("deserializing agent_pub_key failed")))?;
    let cell_id = CellId::new(dna_hash.into(), agent_pub_key.clone().into());
    // define the context of the request
    let api_request = ZomeCall {
        cell_id: cell_id,
        zome_name: ZomeName::from(String::from(ZOME_NAME)),
        fn_name: FunctionName::from(String::from(FN_NAME)),
        payload: encoded_payload,
        cap_secret: None,
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
