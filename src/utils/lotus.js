import { LotusRPC } from "@filecoin-shipyard/lotus-client-rpc";
import { BrowserProvider } from "@filecoin-shipyard/lotus-client-provider-browser";
import { testnet } from "@filecoin-shipyard/lotus-client-schema";
import { ipfs } from ' ../../utils/ipfs.js'



export const getClient = (options = { nodeOrMiner: "node", nodeNumber: 0 }) => {
  // API endpoint for local Lotus devnet
  const API = "ws://localhost:7777";

  // Websocket endpoint for local Lotus devnet
  const wsUrl = API + `/${options.nodeNumber}/${options.nodeOrMiner}/rpc/v0`;

  // Creating and returning a Lotus client that can be used anywhere in the app
  const provider = new BrowserProvider(wsUrl);
  return new LotusRPC(provider, {
    schema:
      options.nodeOrMiner === "node" ? testnet.fullNode : testnet.storageMiner,
  });
};

export const uploadToFilecoin = payload => async dispatch => {
  // Adding file to IPFS
  const nodeClient = getClient({ nodeNumber: 0, nodeOrMiner: 'node' })

  const hasLocal = await nodeClient.Client.ClientHadLocal({'/': payload.cid})
  
  const offers = await nodeClient.clientFindData({ '/': payload.cid})

  const retrievalOffer = {
    Root: offers[0].Root,
    Size: offers[0].Size,
    Total: offers[0].MinPrice,
    PaymentInterval: offers[0].PaymentInterval,
    PaymentIntervalIncrease: offers[0].PaymentIntervalIncrease,
    Client: payload.walletAddress,
    Miner: offers[0].Miner,
    MinerPeerID: offers[0].MinerPeerID
  }

  const error = await nodeClient.clientRetrieve(retrievalOffer, null)
if (!error) {
  document.getElementById('fetchData').innerText = 'Data fetched Successfully'
  window.open(`http://localhost:7070/ipfs/${payload.cid}`, '_blank')
} else {
  document.getElementById('fetchData').innerText =
    'Error while fetching data. Try again.'
}
  
  for await (const result of ipfs.add(payload.fileBuffer)) {
    // Creating a Storage Deal with a Miner
    const dataRef = {
      Data: {
        TransferType: 'graphsync',
        Root: {
          '/': result.path
        },
        PieceCid: null,
        PieceSize: 0
      },
      Wallet: payload.defaultWalletAddress,
      Miner: payload.targetMiner,
      EpochPrice: payload.epochPrice,
      MinBlocksDuration: 300
    }

    const deal = await nodeClient.clientStartDeal(dataRef)

    document.getElementById('uploadToFilecoin').innerText =
      'Upload to Filecoin Network'

    dispatch({
      type: types.ADD_DATA_TO_FILECOIN,
      payload: {
        id: deal['/'],
        cid: result.path
      }
    })
  }
}

