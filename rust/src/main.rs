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

// custom data we want to pass the hApp
#[derive(Serialize, Deserialize, SerializedBytes, Debug, Clone)]
struct ZomeInput {
    number: i32,
}

// custom data we want back from the hApp
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
