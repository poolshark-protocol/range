import { SUPPORTED_NETWORKS } from './scripts/constants/supportedNetworks';
import { DEPLOY_RANGEPOOLS, MINT_POSITION, MINT_TOKENS, VERIFY_CONTRACTS } from './tasks/constants/taskNames';
import { purpleLog } from './test/utils/colors';

export function handleHardhatTasks() {
    handleRangePoolTasks();
}

function handleRangePoolTasks() {
    // for (const network in SUPPORTED_NETWORKS) {
    //     if (Object.keys(LOCAL_NETWORKS).includes(network)) continue;
    //     hre.masterNetwork = MASTER_NETWORKS[network];
    //     break;
    // }
    if (process.argv.includes(DEPLOY_RANGEPOOLS)) {
        import('./tasks/deploy/deploy-rangepools');
        logTask(DEPLOY_RANGEPOOLS);
    } else if (process.argv.includes(MINT_TOKENS)) {
        import('./tasks/deploy/mint-tokens');
        logTask(MINT_TOKENS);
    } else if (process.argv.includes(MINT_POSITION)) {
        import('./tasks/deploy/mint-position');
        logTask(MINT_POSITION);
    } else if (process.argv.includes(VERIFY_CONTRACTS)) {
        import('./tasks/deploy/verify-contracts');
        logTask(VERIFY_CONTRACTS);
    }
}

function logTask(taskName: string) {
    purpleLog(`\n🎛  Running ${taskName} task...\n`);
}
