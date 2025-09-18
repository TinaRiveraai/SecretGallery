import { DeployFunction } from "hardhat-deploy/types";
import { HardhatRuntimeEnvironment } from "hardhat/types";

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployer } = await hre.getNamedAccounts();
  const { deploy } = hre.deployments;

  // Deploy SecretGallery contract
  const deployedSecretGallery = await deploy("SecretGallery", {
    from: deployer,
    log: true,
  });

  console.log(`SecretGallery contract: `, deployedSecretGallery.address);

  // Deploy SecretGalleryFactory contract
  const deployedSecretGalleryFactory = await deploy("SecretGalleryFactory", {
    from: deployer,
    log: true,
  });

  console.log(`SecretGalleryFactory contract: `, deployedSecretGalleryFactory.address);

  // Deploy FHECounter contract (keeping for compatibility)
  const deployedFHECounter = await deploy("FHECounter", {
    from: deployer,
    log: true,
  });

  console.log(`FHECounter contract: `, deployedFHECounter.address);
};
export default func;
func.id = "deploy_secretGallery"; // id required to prevent reexecution
func.tags = ["SecretGallery", "SecretGalleryFactory", "FHECounter"];
