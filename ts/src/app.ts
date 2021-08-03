import {
  AgentPubKey,
  AppWebsocket,
  CallZomeRequest,
  CellId,
  HoloHash
} from '@holochain/conductor-api';
import { Buffer } from 'buffer';

const WS_URL = 'ws://localhost:8888';
const DNA_HASH = 'uhC0kHvFAj_TiqlX2aS6ZyMQLYshDozOl2y-QgOw2GVVSiyDYIWwr';
const AGENT_PUB_KEY = 'uhCAkYV71BjFj7gNeOkJ96QXTPRChoEnREcJIC5WR4YbONLl_4y1U';
const ZOME_NAME = 'numbers';
const FN_NAME = 'add_ten';

// .slice(1) to trim the leading `u` to match expected Holochain serialization
const dnaHash: HoloHash = Buffer.from(DNA_HASH.slice(1), 'base64');
const agentPubKey: AgentPubKey = Buffer.from(AGENT_PUB_KEY.slice(1), 'base64');
const cell_id: CellId = [dnaHash, agentPubKey];

interface ZomeInput {
  number: number;
}

interface ZomeOutput {
  other_number: number;
}

AppWebsocket.connect(WS_URL).then(
  // connect to the running holochain conductor
  async (appClient) => {
    console.log('connected to happ');
    const payload: ZomeInput = { number: 10 };
    // define the context of the request
    const apiRequest: CallZomeRequest =
    {
      cap: null,
      cell_id,
      zome_name: ZOME_NAME,
      fn_name: FN_NAME,
      provenance: agentPubKey,
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
