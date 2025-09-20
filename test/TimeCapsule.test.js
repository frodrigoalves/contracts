const { expect } = require("chai");
const { ethers } = require("hardhat");
const { parseEther } = ethers.utils;
const { time } = require("@nomicfoundation/hardhat-network-helpers");

describe("TimeCapsule", function () {
    let TimeCapsule;
    let timeCapsule;
    let MockToken;
    let token;
    let AvatarBase;
    let avatarBase;
    let owner;
    let user;
    let beneficiary;

    const oneDay = 24 * 60 * 60;
    const oneWeek = 7 * oneDay;
    const tokenAmount = parseEther("100");
    const metadataURI = "ipfs://QmTest123";

    beforeEach(async function () {
        [owner, user, beneficiary] = await ethers.getSigners();

        // Deploy MockToken
        MockToken = await ethers.getContractFactory("MockToken");
        token = await MockToken.deploy(parseEther("1000000"));
        await token.deployed();

        // Deploy AvatarBase
        AvatarBase = await ethers.getContractFactory("AvatarBase");
        avatarBase = await AvatarBase.deploy();
        await avatarBase.deployed();

        // Deploy TimeCapsule
        TimeCapsule = await ethers.getContractFactory("TimeCapsule");
        timeCapsule = await TimeCapsule.deploy(avatarBase.address);
        await timeCapsule.deployed();

        // Authorize TimeCapsule for token operations
        await token.authorizeContract(timeCapsule.address);

        // Setup user with tokens and avatar
        await token.transfer(user.address, parseEther("1000"));
        await avatarBase.createAvatar(user.address, metadataURI);
    });

    describe("Capsule Creation", function () {
        beforeEach(async function () {
            await token.connect(user).approve(timeCapsule.address, tokenAmount);
        });

        it("Should create a time capsule", async function () {
            const unlockTime = (await time.latest()) + oneWeek;
            const avatarId = 1;

            await timeCapsule.connect(user).createCapsule(
                token.address,
                tokenAmount,
                unlockTime,
                beneficiary.address,
                avatarId,
                "Test message"
            );

            const capsule = await timeCapsule.getCapsule(1);
            expect(capsule.token).to.equal(token.address);
            expect(capsule.amount).to.equal(tokenAmount);
            expect(capsule.unlockTime).to.equal(unlockTime);
            expect(capsule.beneficiary).to.equal(beneficiary.address);
            expect(capsule.avatarId).to.equal(avatarId);
            expect(capsule.message).to.equal("Test message");
            expect(capsule.claimed).to.be.false;
        });

        it("Should lock tokens in the contract", async function () {
            const unlockTime = (await time.latest()) + oneWeek;
            await timeCapsule.connect(user).createCapsule(
                token.address,
                tokenAmount,
                unlockTime,
                beneficiary.address,
                1,
                "Test message"
            );

            expect(await token.balanceOf(timeCapsule.address)).to.equal(tokenAmount);
        });

        it("Should emit CapsuleCreated event", async function () {
            const unlockTime = (await time.latest()) + oneWeek;
            await expect(
                timeCapsule.connect(user).createCapsule(
                    token.address,
                    tokenAmount,
                    unlockTime,
                    beneficiary.address,
                    1,
                    "Test message"
                )
            ).to.emit(timeCapsule, "CapsuleCreated");
        });
    });

    describe("Capsule Claiming", function () {
        let capsuleId;
        let unlockTime;

        beforeEach(async function () {
            await token.connect(user).approve(timeCapsule.address, tokenAmount);
            unlockTime = (await time.latest()) + oneWeek;
            
            await timeCapsule.connect(user).createCapsule(
                token.address,
                tokenAmount,
                unlockTime,
                beneficiary.address,
                1,
                "Test message"
            );
            capsuleId = 1;
        });

        it("Should allow claiming after unlock time", async function () {
            await time.increase(oneWeek + oneDay);
            
            await timeCapsule.connect(beneficiary).claimCapsule(capsuleId);
            
            expect(await token.balanceOf(beneficiary.address)).to.equal(tokenAmount);
            const capsule = await timeCapsule.getCapsule(capsuleId);
            expect(capsule.claimed).to.be.true;
        });

        it("Should prevent claiming before unlock time", async function () {
            await expect(
                timeCapsule.connect(beneficiary).claimCapsule(capsuleId)
            ).to.be.revertedWith("Capsule not yet unlocked");
        });

        it("Should prevent unauthorized claiming", async function () {
            await time.increase(oneWeek + oneDay);
            await expect(
                timeCapsule.connect(user).claimCapsule(capsuleId)
            ).to.be.revertedWith("Not capsule beneficiary");
        });

        it("Should prevent double claiming", async function () {
            await time.increase(oneWeek + oneDay);
            await timeCapsule.connect(beneficiary).claimCapsule(capsuleId);
            
            await expect(
                timeCapsule.connect(beneficiary).claimCapsule(capsuleId)
            ).to.be.revertedWith("Capsule already claimed");
        });
    });

    describe("Capsule Management", function () {
        let capsuleId;

        beforeEach(async function () {
            await token.connect(user).approve(timeCapsule.address, tokenAmount);
            const unlockTime = (await time.latest()) + oneWeek;
            
            await timeCapsule.connect(user).createCapsule(
                token.address,
                tokenAmount,
                unlockTime,
                beneficiary.address,
                1,
                "Test message"
            );
            capsuleId = 1;
        });

        it("Should return correct capsule details", async function () {
            const capsule = await timeCapsule.getCapsule(capsuleId);
            expect(capsule.creator).to.equal(user.address);
            expect(capsule.amount).to.equal(tokenAmount);
        });

        it("Should list user capsules correctly", async function () {
            const userCapsules = await timeCapsule.getUserCapsules(user.address);
            expect(userCapsules.length).to.equal(1);
            expect(userCapsules[0].toNumber()).to.equal(capsuleId);
        });

        it("Should list beneficiary capsules correctly", async function () {
            const beneficiaryCapsules = await timeCapsule.getBeneficiaryCapsules(beneficiary.address);
            expect(beneficiaryCapsules.length).to.equal(1);
            expect(beneficiaryCapsules[0].toNumber()).to.equal(capsuleId);
        });
    });
});