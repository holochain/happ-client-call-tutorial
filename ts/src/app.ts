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
