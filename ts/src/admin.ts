import { AdminWebsocket } from '@holochain/conductor-api';
import { Buffer } from 'buffer';

// port of the Holochain's Admin API
const ADMIN_PORT = 49590; // adapt after starting holochain sandbox

AdminWebsocket.connect(`ws://localhost:${ADMIN_PORT}`).then(
  async (adminClient) => {
    try {
      const dnasRaw = await adminClient.listDnas();
      // encode serialized response to base64 string
      const dnas = dnasRaw.map((dnaRaw) => {
        const buf = Buffer.from(dnaRaw);
        /// holo hashes begin with a lower case "u"
        return `u${buf.toString('base64')}`;
      });
      console.log('DNAs', dnas);
    } catch (error) {
      console.log('error occurred', error);
    } finally {
      adminClient.client.close();
    }
  }
);
