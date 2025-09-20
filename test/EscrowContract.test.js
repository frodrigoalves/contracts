const { expect } = require("chai");
const { ethers } = require("hardhat");
const { parseEther } = ethers.utils;
const { time } = require("@nomicfoundation/hardhat-network-helpers");

describe("EscrowContract", function () {
    let SGLToken;
    let EscrowContract;
    let token;
    let escrow;
    let owner;
    let beneficiary;
    let other;
    
    const lockAmount = parseEther("1000");
    const initialSupply = parseEther("1000000");

    beforeEach(async function () {
        [owner, beneficiary, other] = await ethers.getSigners();
        
        // Deploy SGL Token
        SGLToken = await ethers.getContractFactory("SGLToken");
        token = await SGLToken.deploy(owner.address, initialSupply);
        await token.deployed();
        
        // Deploy Escrow Contract
        EscrowContract = await ethers.getContractFactory("EscrowContract");
        escrow = await EscrowContract.deploy(token.address);
        await escrow.deployed();
    });

    describe("Deployment", function () {
        it("Should set the correct token address", async function () {
            expect(await escrow.sgl()).to.equal(token.address);
        });

        it("Should set the correct owner", async function () {
            expect(await escrow.owner()).to.equal(owner.address);
        });
    });

    describe("Locking Funds", function () {
        const capsuleId = 1;
        const unlockTime = Math.floor(Date.now() / 1000) + 3600; // 1 hour from now

        beforeEach(async function () {
            await token.approve(escrow.address, lockAmount);
        });

        it("Should lock funds correctly", async function () {
            await escrow.lockFunds(capsuleId, beneficiary.address, lockAmount, unlockTime);
            
            const lock = await escrow.locks(capsuleId);
            expect(lock.beneficiary).to.equal(beneficiary.address);
            expect(lock.amount).to.equal(lockAmount);
            expect(lock.unlockTime).to.equal(unlockTime);
            expect(lock.released).to.be.false;
        });

        it("Should emit FundsLocked event", async function () {
            await expect(
                escrow.lockFunds(capsuleId, beneficiary.address, lockAmount, unlockTime)
            )
                .to.emit(escrow, "FundsLocked")
                .withArgs(capsuleId, beneficiary.address, lockAmount, unlockTime);
        });

        it("Should prevent locking for existing capsule", async function () {
            await escrow.lockFunds(capsuleId, beneficiary.address, lockAmount, unlockTime);
            
            await expect(
                escrow.lockFunds(capsuleId, beneficiary.address, lockAmount, unlockTime)
            ).to.be.revertedWith("Already locked");
        });

        it("Should only allow owner to lock funds", async function () {
            await expect(
                escrow.connect(other).lockFunds(capsuleId, beneficiary.address, lockAmount, unlockTime)
            ).to.be.revertedWith("Ownable: caller is not the owner");
        });

        it("Should handle multiple locks with different IDs", async function () {
            await escrow.lockFunds(capsuleId, beneficiary.address, lockAmount, unlockTime);
            await escrow.lockFunds(capsuleId + 1, beneficiary.address, lockAmount, unlockTime);
            
            const lock1 = await escrow.locks(capsuleId);
            const lock2 = await escrow.locks(capsuleId + 1);
            
            expect(lock1.amount).to.equal(lockAmount);
            expect(lock2.amount).to.equal(lockAmount);
        });
    });

    describe("Releasing Funds", function () {
        const capsuleId = 1;
        let unlockTime;

        beforeEach(async function () {
            unlockTime = (await time.latest()) + 3600; // 1 hour from now
            await token.approve(escrow.address, lockAmount);
            await escrow.lockFunds(capsuleId, beneficiary.address, lockAmount, unlockTime);
        });

        it("Should release funds after unlock time", async function () {
            await time.increase(3601); // 1 hour + 1 second
            
            await escrow.connect(beneficiary).releaseFunds(capsuleId);
            
            expect(await token.balanceOf(beneficiary.address)).to.equal(lockAmount);
            const lock = await escrow.locks(capsuleId);
            expect(lock.released).to.be.true;
        });

        it("Should emit FundsReleased event", async function () {
            await time.increase(3601);
            
            await expect(escrow.connect(beneficiary).releaseFunds(capsuleId))
                .to.emit(escrow, "FundsReleased")
                .withArgs(capsuleId, beneficiary.address, lockAmount);
        });

        it("Should prevent early release", async function () {
            await expect(
                escrow.connect(beneficiary).releaseFunds(capsuleId)
            ).to.be.revertedWith("not ready");
        });

        it("Should prevent release from non-beneficiary", async function () {
            await time.increase(3601);
            
            await expect(
                escrow.connect(other).releaseFunds(capsuleId)
            ).to.be.revertedWith("not beneficiary");
        });

        it("Should prevent double release", async function () {
            await time.increase(3601);
            await escrow.connect(beneficiary).releaseFunds(capsuleId);
            
            await expect(
                escrow.connect(beneficiary).releaseFunds(capsuleId)
            ).to.be.revertedWith("already released");
        });
    });

    describe("Emergency Functions", function () {
        it("Should allow owner to withdraw tokens", async function () {
            const amount = parseEther("100");
            await token.transfer(escrow.address, amount);
            
            await escrow.emergencyWithdraw(owner.address, amount);
            expect(await token.balanceOf(owner.address)).to.equal(initialSupply);
        });

        it("Should prevent non-owner from emergency withdraw", async function () {
            const amount = parseEther("100");
            await token.transfer(escrow.address, amount);
            
            await expect(
                escrow.connect(other).emergencyWithdraw(other.address, amount)
            ).to.be.revertedWith("Ownable: caller is not the owner");
        });
    });

    describe("Edge Cases", function () {
        it("Should handle zero amount locks", async function () {
            const unlockTime = (await time.latest()) + 3600;
            await token.approve(escrow.address, 0);
            
            await expect(
                escrow.lockFunds(1, beneficiary.address, 0, unlockTime)
            ).to.be.revertedWith("transfer failed");
        });

        it("Should handle past unlock times", async function () {
            const pastTime = (await time.latest()) - 3600;
            await token.approve(escrow.address, lockAmount);
            
            await escrow.lockFunds(1, beneficiary.address, lockAmount, pastTime);
            await escrow.connect(beneficiary).releaseFunds(1);
            
            expect(await token.balanceOf(beneficiary.address)).to.equal(lockAmount);
        });

        it("Should handle multiple releases at same time", async function () {
            const unlockTime = (await time.latest()) + 3600;
            await token.approve(escrow.address, lockAmount.mul(2));
            
            await escrow.lockFunds(1, beneficiary.address, lockAmount, unlockTime);
            await escrow.lockFunds(2, beneficiary.address, lockAmount, unlockTime);
            
            await time.increase(3601);
            
            await escrow.connect(beneficiary).releaseFunds(1);
            await escrow.connect(beneficiary).releaseFunds(2);
            
            expect(await token.balanceOf(beneficiary.address)).to.equal(lockAmount.mul(2));
        });
    });
});