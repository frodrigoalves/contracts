const { expect } = require("chai");
const { ethers } = require("hardhat");
const { parseEther } = ethers.utils;

describe("FeeManager", function () {
    let SGLToken;
    let FeeManager;
    let token;
    let feeManager;
    let owner;
    let manager;
    let ops;
    let oracle;
    let user;
    
    const initialSupply = parseEther("1000000");
    const feeAmount = parseEther("1000");

    const MANAGER_ROLE = ethers.utils.keccak256(ethers.utils.toUtf8Bytes("MANAGER_ROLE"));

    beforeEach(async function () {
        [owner, manager, ops, oracle, user] = await ethers.getSigners();
        
        // Deploy SGL Token
        SGLToken = await ethers.getContractFactory("SGLToken");
        token = await SGLToken.deploy(owner.address, initialSupply);
        await token.deployed();
        
        // Deploy Fee Manager
        FeeManager = await ethers.getContractFactory("FeeManager");
        feeManager = await FeeManager.deploy(token.address);
        await feeManager.deployed();

        // Setup for testing
        await token.transfer(user.address, feeAmount.mul(2));
    });

    describe("Deployment", function () {
        it("Should set the correct token address", async function () {
            expect(await feeManager.sgl()).to.equal(token.address);
        });

        it("Should set correct burn address", async function () {
            expect(await feeManager.burnAddress()).to.equal(ethers.constants.AddressZero);
        });

        it("Should set correct percentages", async function () {
            expect(await feeManager.burnPercent()).to.equal(2);
            expect(await feeManager.opsPercent()).to.equal(30);
            expect(await feeManager.oraclePercent()).to.equal(20);
        });

        it("Should set up roles correctly", async function () {
            expect(await feeManager.hasRole(await feeManager.DEFAULT_ADMIN_ROLE(), owner.address)).to.be.true;
            expect(await feeManager.hasRole(MANAGER_ROLE, owner.address)).to.be.true;
        });
    });

    describe("Role Management", function () {
        it("Should allow admin to grant manager role", async function () {
            await feeManager.grantRole(MANAGER_ROLE, manager.address);
            expect(await feeManager.hasRole(MANAGER_ROLE, manager.address)).to.be.true;
        });

        it("Should prevent non-admin from granting roles", async function () {
            await expect(
                feeManager.connect(user).grantRole(MANAGER_ROLE, manager.address)
            ).to.be.revertedWith("AccessControl:");
        });

        it("Should allow admin to revoke manager role", async function () {
            await feeManager.grantRole(MANAGER_ROLE, manager.address);
            await feeManager.revokeRole(MANAGER_ROLE, manager.address);
            expect(await feeManager.hasRole(MANAGER_ROLE, manager.address)).to.be.false;
        });
    });

    describe("Fee Collection", function () {
        beforeEach(async function () {
            await feeManager.grantRole(MANAGER_ROLE, manager.address);
            await token.connect(user).approve(feeManager.address, feeAmount);
        });

        it("Should collect and distribute fees correctly", async function () {
            const burnAmount = feeAmount.mul(2).div(100);
            const opsAmount = feeAmount.mul(30).div(100);
            const oracleAmount = feeAmount.mul(20).div(100);
            
            await feeManager.connect(manager).collectAndDistribute(user.address, feeAmount);
            
            // Check burn
            expect(await token.balanceOf(ethers.constants.AddressZero)).to.equal(burnAmount);
            
            // Check remaining balance in contract
            const remainingAmount = feeAmount.sub(burnAmount).sub(opsAmount).sub(oracleAmount);
            expect(await token.balanceOf(feeManager.address)).to.equal(remainingAmount);
        });

        it("Should emit FeeCollected event", async function () {
            await expect(
                feeManager.connect(manager).collectAndDistribute(user.address, feeAmount)
            )
                .to.emit(feeManager, "FeeCollected")
                .withArgs(user.address, feeAmount);
        });

        it("Should only allow manager to collect fees", async function () {
            await expect(
                feeManager.connect(user).collectAndDistribute(user.address, feeAmount)
            ).to.be.revertedWith("AccessControl:");
        });

        it("Should handle zero amount correctly", async function () {
            await expect(
                feeManager.connect(manager).collectAndDistribute(user.address, 0)
            ).to.be.revertedWith("transfer failed");
        });
    });

    describe("Fee Distribution", function () {
        beforeEach(async function () {
            await feeManager.grantRole(MANAGER_ROLE, manager.address);
            await token.connect(user).approve(feeManager.address, feeAmount);
        });

        it("Should calculate fee splits correctly", async function () {
            const tx = await feeManager.connect(manager).collectAndDistribute(user.address, feeAmount);
            const receipt = await tx.wait();
            
            // Calculate expected amounts
            const burnAmount = feeAmount.mul(2).div(100);
            const opsAmount = feeAmount.mul(30).div(100);
            const oracleAmount = feeAmount.mul(20).div(100);
            const stakingAmount = feeAmount.sub(burnAmount).sub(opsAmount).sub(oracleAmount);
            
            // Verify through events or balance checks
            expect(await token.balanceOf(ethers.constants.AddressZero)).to.equal(burnAmount);
            expect(await token.balanceOf(feeManager.address)).to.equal(stakingAmount);
        });

        it("Should handle rounding correctly", async function () {
            const oddAmount = parseEther("777");
            await token.connect(user).approve(feeManager.address, oddAmount);
            
            await feeManager.connect(manager).collectAndDistribute(user.address, oddAmount);
            
            // Verify total balance is accounted for
            const contractBalance = await token.balanceOf(feeManager.address);
            const burnBalance = await token.balanceOf(ethers.constants.AddressZero);
            expect(contractBalance.add(burnBalance)).to.be.lte(oddAmount);
        });
    });

    describe("Edge Cases", function () {
        beforeEach(async function () {
            await feeManager.grantRole(MANAGER_ROLE, manager.address);
        });

        it("Should handle insufficient allowance", async function () {
            await token.connect(user).approve(feeManager.address, feeAmount.div(2));
            
            await expect(
                feeManager.connect(manager).collectAndDistribute(user.address, feeAmount)
            ).to.be.revertedWith("transfer failed");
        });

        it("Should handle insufficient balance", async function () {
            const tooMuch = parseEther("2000000");
            await token.connect(user).approve(feeManager.address, tooMuch);
            
            await expect(
                feeManager.connect(manager).collectAndDistribute(user.address, tooMuch)
            ).to.be.revertedWith("transfer failed");
        });

        it("Should process multiple fee collections", async function () {
            await token.connect(user).approve(feeManager.address, feeAmount.mul(2));
            
            await feeManager.connect(manager).collectAndDistribute(user.address, feeAmount);
            await feeManager.connect(manager).collectAndDistribute(user.address, feeAmount);
            
            // Verify total processed
            const burnBalance = await token.balanceOf(ethers.constants.AddressZero);
            expect(burnBalance).to.equal(feeAmount.mul(2).mul(2).div(100));
        });
    });
});