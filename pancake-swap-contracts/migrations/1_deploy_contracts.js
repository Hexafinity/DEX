// const PancakeFactoryV2 = artifacts.require("PancakeFactoryV2");

// let addressFeeSetter = "0xe5D1cb60cb065bf23d3022D02a205D829Feb9831";

// module.exports = function (deployer) {
//   deployer.deploy(PancakeFactoryV2, addressFeeSetter);
// };

const PancakeRouterV2 = artifacts.require("PancakeRouterV2");

let weth = "0xae13d989daC2f0dEbFf460aC112a837C89BAa7cd";
let factory = "0xd68A8fFA49f05BFfC7664b60f7D33da30e196F32";

module.exports = function (deployer) {
  deployer.deploy(PancakeRouterV2, factory, weth);
};
