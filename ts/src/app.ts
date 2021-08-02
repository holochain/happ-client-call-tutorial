import {
  AppWebsocket,
  CellId,
  HoloHash,
  AgentPubKey
} from '@holochain/conductor-api';
import { Buffer } from 'buffer';

// port of the Holochain's App API
const APP_PORT = 8888;

// TODO find out why the first 'u' is not encoded
// when omitting it, encoding works
const DNA_HASH = 'uhC0kHvFAj_TiqlX2aS6ZyMQLYshDozOl2y-QgOw2GVVSiyDYIWwr'.slice(1);
const AGENT_PUB_KEY = 'uhCAkYV71BjFj7gNeOkJ96QXTPRChoEnREcJIC5WR4YbONLl_4y1U'.slice(1);

const dnaHash: HoloHash = Buffer.from(DNA_HASH, 'base64');
const agentPubKey: AgentPubKey = Buffer.from(AGENT_PUB_KEY, 'base64');
const cell_id: CellId = [dnaHash, agentPubKey];

interface WhoAmIOutput {
  agent_initial_pubkey: Buffer;
  agent_latest_pubkey: Buffer;
}

interface NumbersInput {
  number: number;
}

interface NumbersOutput {
  other_number: number;
}

AppWebsocket.connect(`ws://localhost:${APP_PORT}`).then(
  async (appClient) => {
    console.log('connected to happ');
    console.log();
    try {
      // first calling another zome function of the same DNA
      // which will return our own agent pub key
      const whoAmIOutput: WhoAmIOutput = await appClient.callZome(
        {
          cap: null, // no capability secret required
          cell_id,
          zome_name: 'whoami',
          fn_name: 'whoami',
          provenance: agentPubKey,
          payload: null // no input for the zome fn
        }
      );
      console.log('zome: whoami = fn: whoami - output', whoAmIOutput);
      // the result object contains serialized base64 hashes
      console.log('decoded agent_initial_pubkey', decodeHoloHash(whoAmIOutput.agent_initial_pubkey));
      console.log('decoded agent_latest_pubkey', decodeHoloHash(whoAmIOutput.agent_latest_pubkey));
      console.log();

      // next we'll call the same DNA as in the Rust example
      const payload: NumbersInput = { number: 10 };
      const numbersOutput: NumbersOutput = await appClient.callZome(
        {
          cap: null,
          cell_id,
          zome_name: 'numbers',
          fn_name: 'add_ten',
          provenance: agentPubKey,
          payload
        }
      );
      // the result is already deserialized
      console.log('zome: numbers - fn: add_ten - output', numbersOutput);
    } catch (error) {
      console.log('error occurred', error);
    } finally {
      appClient.client.close();
    }
  }
);

// prepend a 'u' and convert to a base64 string
function decodeHoloHash(buf: Buffer) {
  return `u${buf.toString('base64')}`;
}
