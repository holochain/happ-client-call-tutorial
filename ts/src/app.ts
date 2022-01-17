import {
  AppWebsocket,
  CallZomeRequest,
} from '@holochain/client';
import { AgentPubKey, CellId, HoloHash } from '@holochain/client/lib/types/common';
import { Buffer } from 'buffer';

const WS_URL = 'ws://localhost:8888';
// replace this, based on the DnaHash portion of the output of `hc sandbox call 0 list-cells`
const DNA_HASH = 'uhC0kaiJKjACG1NunHwWUTXr3RER72PkxT62W4GNa3qOuwJWe1gUQ';
// replace this, based on the AgentPubKey portion of the output of `hc sandbox call 0 list-cells`
const AGENT_PUB_KEY = 'uhCAkPXiK-DI-fY9erjy68FFQn7L4eyjtjkRH51r8URPFFUX6JLpM';
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
      cap_secret: null,
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
