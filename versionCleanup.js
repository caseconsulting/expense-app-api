const {
  DeleteFunctionCommand,
  DeleteLayerVersionCommand,
  LambdaClient,
  ListFunctionsCommand,
  ListLayersCommand,
  ListLayerVersionsCommand,
  ListVersionsByFunctionCommand
} = require('@aws-sdk/client-lambda');
const client = new LambdaClient();
// maintains a maximum of 5 versions for any given lambda function
const VERSIONS_TO_KEEP = 5;

/**
 * Deletes all older Lambda versions except for the 5 most recent
 */
async function deleteOldLambdaVersions() {
  console.log('Initiating process to delete old Lambda versions');
  const listFunctionsCommand = new ListFunctionsCommand();
  const resp = await client.send(listFunctionsCommand);

  for (let func of resp.Functions) {
    let marker;
    let versions = [];
    const functionName = func.FunctionName;
    // set up command for initial page of versions
    let listVersionsByFunctionCommand = new ListVersionsByFunctionCommand({ FunctionName: func.FunctionName });
    do {
      // keep retrieving lambda function versions until no more pages
      const resp = await client.send(listVersionsByFunctionCommand);
      marker = resp.NextMarker;
      listVersionsByFunctionCommand = new ListVersionsByFunctionCommand({
        FunctionName: func.FunctionName,
        Marker: marker
      });
      versions = [versions, resp?.Versions];
      versions = versions.flat();
    } while (marker);
    // slice all but most recent versions to delete later
    let versionsToDelete = versions?.slice(0, -VERSIONS_TO_KEEP);
    versionsToDelete = versionsToDelete.filter((v) => v.Version !== '$LATEST');
    if (versionsToDelete.length > 0) {
      console.log(
        `Deleting versions ${versionsToDelete[0].Version} to ${
          versionsToDelete[versionsToDelete.length - 1].Version
        } from function ${functionName}`
      );
      for (let functionVersion of versionsToDelete) {
        // delete every older version 1 by 1 to prevent TooManyRequestsException error
        const params = {
          FunctionName: functionName,
          Qualifier: functionVersion.Version
        };
        const deleteFunctionCommand = new DeleteFunctionCommand(params);
        await client.send(deleteFunctionCommand);
      }
    } else {
      console.log(`No older versions to delete for function ${functionName}`);
    }
  }
} // deleteOldLambdaVersions

/**
 * Deletes all older Lambda Layer versions except for the 5 most recent
 */
async function deleteOldLambdaLayerVersions() {
  console.log('\nInitiating process to delete old Lambda Layer versions');
  const listLayersCommand = new ListLayersCommand();
  const resp = await client.send(listLayersCommand);

  for (let layer of resp.Layers) {
    const layerName = layer.LayerName;
    const listLayerVersionsCommand = new ListLayerVersionsCommand({ LayerName: layerName });
    const resp = await client.send(listLayerVersionsCommand);
    // slice all but most recent versions to delete later
    const versionsToDelete = resp?.LayerVersions?.slice(VERSIONS_TO_KEEP);
    if (versionsToDelete.length > 0) {
      console.log(
        `Deleting versions ${versionsToDelete[versionsToDelete.length - 1].Version} to ${
          versionsToDelete[0].Version
        } from layer ${layerName}`
      );
      for (let layerVersion of versionsToDelete) {
        // delete every older version 1 by 1 to prevent TooManyRequestsException error
        const params = {
          LayerName: layerName,
          VersionNumber: layerVersion.Version
        };

        const deleteLayerVersionCommand = new DeleteLayerVersionCommand(params);
        await client.send(deleteLayerVersionCommand);
      }
    } else {
      console.log(`No older versions to delete for layer ${layerName}`);
    }
  }
} // deleteOldLambdaLayerVersions

/**
 * Entry point for script to delete older verions.
 */
async function main() {
  try {
    await deleteOldLambdaVersions();
    await deleteOldLambdaLayerVersions();
  } catch (err) {
    console.log('error', err);
  }
} // main

main();
