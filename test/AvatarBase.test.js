const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("AvatarBase", function () {
    let AvatarBase;
    let avatarBase;
    let owner;
    let user;
    let operator;

    beforeEach(async function () {
        [owner, user, operator] = await ethers.getSigners();
        AvatarBase = await ethers.getContractFactory("AvatarBase");
        avatarBase = await AvatarBase.deploy();
        await avatarBase.deployed();
    });

    describe("Avatar Creation", function () {
        const metadataURI = "ipfs://QmTest123";
        
        it("Should create a new avatar", async function () {
            await avatarBase.createAvatar(user.address, metadataURI);
            const avatarId = 1; // First avatar ID
            
            expect(await avatarBase.ownerOf(avatarId)).to.equal(user.address);
            expect(await avatarBase.tokenURI(avatarId)).to.equal(metadataURI);
        });

        it("Should increment avatar IDs correctly", async function () {
            await avatarBase.createAvatar(user.address, metadataURI);
            await avatarBase.createAvatar(operator.address, metadataURI);
            
            expect(await avatarBase.ownerOf(1)).to.equal(user.address);
            expect(await avatarBase.ownerOf(2)).to.equal(operator.address);
        });

        it("Should emit AvatarCreated event", async function () {
            await expect(avatarBase.createAvatar(user.address, metadataURI))
                .to.emit(avatarBase, "AvatarCreated")
                .withArgs(1, user.address);
        });
    });

    describe("Avatar Management", function () {
        const metadataURI = "ipfs://QmTest123";
        let avatarId;

        beforeEach(async function () {
            await avatarBase.createAvatar(user.address, metadataURI);
            avatarId = 1;
        });

        it("Should allow avatar transfer", async function () {
            await avatarBase.connect(user).transferFrom(user.address, operator.address, avatarId);
            expect(await avatarBase.ownerOf(avatarId)).to.equal(operator.address);
        });

        it("Should prevent unauthorized transfer", async function () {
            await expect(
                avatarBase.connect(operator).transferFrom(user.address, operator.address, avatarId)
            ).to.be.revertedWith("ERC721: caller is not token owner or approved");
        });

        it("Should allow approved operator to transfer", async function () {
            await avatarBase.connect(user).approve(operator.address, avatarId);
            await avatarBase.connect(operator).transferFrom(user.address, operator.address, avatarId);
            expect(await avatarBase.ownerOf(avatarId)).to.equal(operator.address);
        });
    });

    describe("Metadata Management", function () {
        const initialURI = "ipfs://QmInitial";
        const updatedURI = "ipfs://QmUpdated";
        let avatarId;

        beforeEach(async function () {
            await avatarBase.createAvatar(user.address, initialURI);
            avatarId = 1;
        });

        it("Should return correct metadata URI", async function () {
            expect(await avatarBase.tokenURI(avatarId)).to.equal(initialURI);
        });

        it("Should allow owner to update metadata", async function () {
            await avatarBase.connect(user).updateMetadata(avatarId, updatedURI);
            expect(await avatarBase.tokenURI(avatarId)).to.equal(updatedURI);
        });

        it("Should prevent unauthorized metadata update", async function () {
            await expect(
                avatarBase.connect(operator).updateMetadata(avatarId, updatedURI)
            ).to.be.revertedWith("Not avatar owner");
        });

        it("Should emit MetadataUpdated event", async function () {
            await expect(avatarBase.connect(user).updateMetadata(avatarId, updatedURI))
                .to.emit(avatarBase, "MetadataUpdated")
                .withArgs(avatarId, updatedURI);
        });
    });

    describe("Avatar Status", function () {
        let avatarId;

        beforeEach(async function () {
            await avatarBase.createAvatar(user.address, "ipfs://QmTest123");
            avatarId = 1;
        });

        it("Should return correct avatar status", async function () {
            const status = await avatarBase.getAvatarStatus(avatarId);
            expect(status.exists).to.be.true;
            expect(status.owner).to.equal(user.address);
        });

        it("Should return false for non-existent avatar", async function () {
            const status = await avatarBase.getAvatarStatus(999);
            expect(status.exists).to.be.false;
        });
    });

    describe("ERC721 Standard", function () {
        const metadataURI = "ipfs://QmTest123";
        let avatarId;

        beforeEach(async function () {
            await avatarBase.createAvatar(user.address, metadataURI);
            avatarId = 1;
        });

        it("Should support ERC721 interface", async function () {
            expect(await avatarBase.supportsInterface("0x80ac58cd")).to.be.true; // ERC721
        });

        it("Should allow setting approval for all", async function () {
            await avatarBase.connect(user).setApprovalForAll(operator.address, true);
            expect(await avatarBase.isApprovedForAll(user.address, operator.address)).to.be.true;
        });

        it("Should emit ApprovalForAll event", async function () {
            await expect(avatarBase.connect(user).setApprovalForAll(operator.address, true))
                .to.emit(avatarBase, "ApprovalForAll")
                .withArgs(user.address, operator.address, true);
        });

        it("Should get correct token balance", async function () {
            expect(await avatarBase.balanceOf(user.address)).to.equal(1);
        });
    });
});