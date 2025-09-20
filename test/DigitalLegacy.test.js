const { expect } = require("chai");
const { ethers } = require("hardhat");
const { parseEther } = ethers.utils;
const { time } = require("@nomicfoundation/hardhat-network-helpers");

describe("DigitalLegacy", function () {
    let DigitalLegacy;
    let digitalLegacy;
    let MockToken;
    let token;
    let AvatarBase;
    let avatarBase;
    let owner;
    let user;
    let heir;
    let validator;

    const metadataURI = "ipfs://QmTest123";
    const tokenAmount = parseEther("1000");
    const oneDay = 24 * 60 * 60;
    const thirtyDays = 30 * oneDay;

    beforeEach(async function () {
        [owner, user, heir, validator] = await ethers.getSigners();

        // Deploy MockToken
        MockToken = await ethers.getContractFactory("MockToken");
        token = await MockToken.deploy(parseEther("1000000"));
        await token.deployed();

        // Deploy AvatarBase
        AvatarBase = await ethers.getContractFactory("AvatarBase");
        avatarBase = await AvatarBase.deploy();
        await avatarBase.deployed();

        // Deploy DigitalLegacy
        DigitalLegacy = await ethers.getContractFactory("DigitalLegacy");
        digitalLegacy = await DigitalLegacy.deploy(avatarBase.address);
        await digitalLegacy.deployed();

        // Setup
        await token.authorizeContract(digitalLegacy.address);
        await token.transfer(user.address, tokenAmount);
        await avatarBase.createAvatar(user.address, metadataURI);
    });

    describe("Legacy Profile Creation", function () {
        it("Should create a legacy profile", async function () {
            await digitalLegacy.connect(user).createLegacyProfile(
                1, // avatarId
                heir.address,
                thirtyDays,
                validator.address
            );

            const profile = await digitalLegacy.getLegacyProfile(user.address);
            expect(profile.exists).to.be.true;
            expect(profile.heir).to.equal(heir.address);
            expect(profile.inactivityPeriod).to.equal(thirtyDays);
            expect(profile.validator).to.equal(validator.address);
        });

        it("Should emit ProfileCreated event", async function () {
            await expect(
                digitalLegacy.connect(user).createLegacyProfile(
                    1,
                    heir.address,
                    thirtyDays,
                    validator.address
                )
            ).to.emit(digitalLegacy, "ProfileCreated")
             .withArgs(user.address, heir.address);
        });

        it("Should prevent duplicate profile creation", async function () {
            await digitalLegacy.connect(user).createLegacyProfile(
                1,
                heir.address,
                thirtyDays,
                validator.address
            );

            await expect(
                digitalLegacy.connect(user).createLegacyProfile(
                    1,
                    heir.address,
                    thirtyDays,
                    validator.address
                )
            ).to.be.revertedWith("Profile already exists");
        });
    });

    describe("Profile Management", function () {
        beforeEach(async function () {
            await digitalLegacy.connect(user).createLegacyProfile(
                1,
                heir.address,
                thirtyDays,
                validator.address
            );
        });

        it("Should update heir address", async function () {
            const newHeir = owner.address;
            await digitalLegacy.connect(user).updateHeir(newHeir);
            
            const profile = await digitalLegacy.getLegacyProfile(user.address);
            expect(profile.heir).to.equal(newHeir);
        });

        it("Should update inactivity period", async function () {
            const newPeriod = 60 * oneDay;
            await digitalLegacy.connect(user).updateInactivityPeriod(newPeriod);
            
            const profile = await digitalLegacy.getLegacyProfile(user.address);
            expect(profile.inactivityPeriod).to.equal(newPeriod);
        });

        it("Should update validator", async function () {
            const newValidator = owner.address;
            await digitalLegacy.connect(user).updateValidator(newValidator);
            
            const profile = await digitalLegacy.getLegacyProfile(user.address);
            expect(profile.validator).to.equal(newValidator);
        });

        it("Should prevent unauthorized updates", async function () {
            await expect(
                digitalLegacy.connect(heir).updateHeir(owner.address)
            ).to.be.revertedWith("Not profile owner");
        });
    });

    describe("Activity Tracking", function () {
        beforeEach(async function () {
            await digitalLegacy.connect(user).createLegacyProfile(
                1,
                heir.address,
                thirtyDays,
                validator.address
            );
        });

        it("Should record activity", async function () {
            await digitalLegacy.connect(user).recordActivity();
            const profile = await digitalLegacy.getLegacyProfile(user.address);
            expect(profile.lastActivity).to.be.closeTo(
                await time.latest(),
                5 // Small delta for block time variations
            );
        });

        it("Should allow validator to record activity", async function () {
            await digitalLegacy.connect(validator).recordActivityFor(user.address);
            const profile = await digitalLegacy.getLegacyProfile(user.address);
            expect(profile.lastActivity).to.be.closeTo(
                await time.latest(),
                5
            );
        });

        it("Should prevent unauthorized activity recording", async function () {
            await expect(
                digitalLegacy.connect(heir).recordActivityFor(user.address)
            ).to.be.revertedWith("Not profile validator");
        });
    });

    describe("Legacy Claiming", function () {
        beforeEach(async function () {
            await digitalLegacy.connect(user).createLegacyProfile(
                1,
                heir.address,
                thirtyDays,
                validator.address
            );
            await token.connect(user).approve(digitalLegacy.address, tokenAmount);
            await digitalLegacy.connect(user).addAsset(token.address, tokenAmount);
        });

        it("Should allow heir to claim after inactivity period", async function () {
            await time.increase(thirtyDays + oneDay);
            await digitalLegacy.connect(heir).claimLegacy(user.address);
            
            expect(await token.balanceOf(heir.address)).to.equal(tokenAmount);
        });

        it("Should prevent early claiming", async function () {
            await time.increase(thirtyDays - oneDay);
            await expect(
                digitalLegacy.connect(heir).claimLegacy(user.address)
            ).to.be.revertedWith("Profile still active");
        });

        it("Should prevent unauthorized claiming", async function () {
            await time.increase(thirtyDays + oneDay);
            await expect(
                digitalLegacy.connect(validator).claimLegacy(user.address)
            ).to.be.revertedWith("Not profile heir");
        });

        it("Should prevent double claiming", async function () {
            await time.increase(thirtyDays + oneDay);
            await digitalLegacy.connect(heir).claimLegacy(user.address);
            
            await expect(
                digitalLegacy.connect(heir).claimLegacy(user.address)
            ).to.be.revertedWith("Legacy already claimed");
        });
    });

    describe("Asset Management", function () {
        beforeEach(async function () {
            await digitalLegacy.connect(user).createLegacyProfile(
                1,
                heir.address,
                thirtyDays,
                validator.address
            );
        });

        it("Should add assets to legacy", async function () {
            await token.connect(user).approve(digitalLegacy.address, tokenAmount);
            await digitalLegacy.connect(user).addAsset(token.address, tokenAmount);
            
            const assets = await digitalLegacy.getProfileAssets(user.address);
            expect(assets.length).to.equal(1);
            expect(assets[0].token).to.equal(token.address);
            expect(assets[0].amount).to.equal(tokenAmount);
        });

        it("Should remove assets from legacy", async function () {
            await token.connect(user).approve(digitalLegacy.address, tokenAmount);
            await digitalLegacy.connect(user).addAsset(token.address, tokenAmount);
            await digitalLegacy.connect(user).removeAsset(token.address);
            
            const assets = await digitalLegacy.getProfileAssets(user.address);
            expect(assets.length).to.equal(0);
        });

        it("Should prevent unauthorized asset management", async function () {
            await token.connect(user).approve(digitalLegacy.address, tokenAmount);
            await expect(
                digitalLegacy.connect(heir).addAsset(token.address, tokenAmount)
            ).to.be.revertedWith("Not profile owner");
        });
    });
});