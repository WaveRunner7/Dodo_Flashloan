import { ethers} from "hardhat";
import { parseEther } from "ethers";
import { deployDodoFlashloan } from "../scripts/deployDodoFlashloan";
import { FlashLoanParams } from "../types";
import { Protocols, QUOTER_ADDRESS2, dodoV2Pool } from "../constants";
import { findRouterByProtocol } from "../utils/findRouterByProtocol";
import { ERC20Token } from "../constants/tokens";
import { impersonateFundERC20 } from "../utils/funding";
import { ERC20__factory } from "../typechain-types";
import { executeFlashloan } from "../scripts/executeFlashloan";
import { expect } from "chai";
import quoter2Abi  from "../abis/quoter2Abi.json";


require('dotenv').config();

describe("DODO Flashloan", () => {

    it("Execute flashloan", async () => {

        const provider = new ethers.JsonRpcProvider("http://127.0.0.1:8545");

        const wallet = await provider.getSigner(0);

        const Flashloan = await deployDodoFlashloan({
            wallet,
        });

        const tokenContract = ERC20__factory.connect(ERC20Token.WETH?.address, provider);

        // const mrWhale = "0x8832924854e3Cedb0a6Abf372e6CCFF9F7654332";

        const flashLoanAddress = await Flashloan.getAddress();

        // await impersonateFundERC20({
        //     sender: mrWhale,
        //     tokenContract,
        //     recipient: flashLoanAddress,
        //     decimals: 18,
        //     amount: "1"
        // })

        // expect(await tokenContract.balanceOf(flashLoanAddress)).to.equal(ethers.parseEther("1"));

        const quoter2 = new ethers.Contract(
            QUOTER_ADDRESS2,
            quoter2Abi,
            provider
        )

        const tokenIn = ERC20Token.WETH?.address;
        const tokenOut = ERC20Token.USDT?.address;
        const fee = 3000;
        const amountIn = ethers.parseEther("1");
        const sqrtPriceLimitX96 = ethers.toBigInt("0");

        const params2 = {
            tokenIn,
            tokenOut,
            fee,
            amountIn,
            sqrtPriceLimitX96
        }

        const quote2 = await quoter2.quoteExactInputSingle.staticCall(params2);

        const params: FlashLoanParams = {
            flashLoanContractAddress: Flashloan.target.toString(),
            flashLoanPool: dodoV2Pool.WETH_ULT,
            loanAmount: ethers.parseEther("0.5"),
            loanAmountDecimals: 18,
            hops: [
                {
                    protocol: Protocols.UNISWAP_V3,
                    data: ethers.AbiCoder.defaultAbiCoder().encode(
                        ["address"],
                        [findRouterByProtocol(Protocols.UNISWAP_V3)]
                    ),
                    path: [ERC20Token.WETH?.address, ERC20Token.USDC?.address],
                    amountOutMinV3: quote2.amountOut,
                    sqrtPriceLimitX96: quote2.sqrtPriceLimitX96
                },
                {
                    protocol: Protocols.SUSHISWAP,
                    data: ethers.AbiCoder.defaultAbiCoder().encode(
                        ["address"],
                        [findRouterByProtocol(Protocols.SUSHISWAP)]
                    ),
                    path: [ERC20Token.USDC?.address, ERC20Token.WETH?.address]
                }
            ],
            gasLimit: 3_000_000,
            gasPrice: ethers.parseUnits("300", "gwei"),
            signer: wallet
        }

        const tx = await executeFlashloan(params);

        expect(await tokenContract.balanceOf(flashLoanAddress)).to.equal(ethers.parseEther("0"));
        expect(tx.hash).to.not.equal(null);
        expect(tx.hash).to.not.equal(undefined);

        const ownerBalance = await tokenContract.balanceOf(wallet.address);

        expect(ownerBalance).to.be.gt(ethers.parseEther("0"));
    
    })

})