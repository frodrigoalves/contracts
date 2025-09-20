const { expect } = require("chai");
const { ethers } = require("hardhat");
const { parseEther } = ethers.utils;

describe("MockToken (tSGL)", function () {
    let Token;
    let token;
    let owner;
    let authorized;
    let user;
    let userTwo;

    beforeEach(async function () {
        [owner, authorized, user, userTwo] = await ethers.getSigners();
        Token = await ethers.getContractFactory("MockToken");
        token = await Token.deploy(parseEther("1000000")); // 1M tokens
        await token.deployed();
    });

    describe("Deployment", function () {
        it("Should set the right owner", async function () {
            expect(await token.owner()).to.equal(owner.address);
        });

        it("Should assign the total supply to owner", async function () {
            const ownerBalance = await token.balanceOf(owner.address);
            expect(await token.totalSupply()).to.equal(ownerBalance);
        });
    });

    describe("Authorization System", function () {
        it("Should allow owner to authorize contracts", async function () {
            await token.authorizeContract(authorized.address);
            expect(await token.isContractAuthorized(authorized.address)).to.be.true;
        });

        it("Should allow owner to revoke authorization", async function () {
            await token.authorizeContract(authorized.address);
            await token.revokeContractAuthorization(authorized.address);
            expect(await token.isContractAuthorized(authorized.address)).to.be.false;
        });

        it("Should fail if non-owner tries to authorize", async function () {
            await expect(
                token.connect(user).authorizeContract(authorized.address)
            ).to.be.revertedWith("Ownable: caller is not the owner");
        });
    });

    describe("Minting", function () {
        beforeEach(async function () {
            await token.authorizeContract(authorized.address);
        });

        it("Should allow authorized contract to mint tokens", async function () {
            const mintAmount = parseEther("100");
            await token.connect(authorized).mint(user.address, mintAmount);
            expect(await token.balanceOf(user.address)).to.equal(mintAmount);
        });

        it("Should fail if unauthorized contract tries to mint", async function () {
            await expect(
                token.connect(user).mint(user.address, parseEther("100"))
            ).to.be.revertedWith("Not authorized");
        });
    });

    describe("Token Locking", function () {
        const lockAmount = parseEther("100");

        beforeEach(async function () {
            await token.authorizeContract(authorized.address);
            await token.transfer(user.address, parseEther("1000"));
            await token.connect(user).approve(authorized.address, lockAmount);
        });

        it("Should allow authorized contract to lock tokens", async function () {
            await token.connect(authorized).lockTokens(user.address, lockAmount);
            expect(await token.lockedBalanceOf(user.address)).to.equal(lockAmount);
        });

        it("Should prevent transfer of locked tokens", async function () {
            await token.connect(authorized).lockTokens(user.address, lockAmount);
            await expect(
                token.connect(user).transfer(userTwo.address, lockAmount)
            ).to.be.revertedWith("Insufficient unlocked balance");
        });

        it("Should allow authorized contract to unlock tokens", async function () {
            await token.connect(authorized).lockTokens(user.address, lockAmount);
            await token.connect(authorized).unlockTokens(user.address, lockAmount);
            expect(await token.lockedBalanceOf(user.address)).to.equal(0);
        });
    });

    describe("Pausable", function () {
        it("Should allow owner to pause and unpause", async function () {
            await token.pause();
            expect(await token.paused()).to.be.true;

            await token.unpause();
            expect(await token.paused()).to.be.false;
        });

        it("Should prevent transfers when paused", async function () {
            await token.pause();
            await expect(
                token.transfer(user.address, parseEther("100"))
            ).to.be.revertedWith("Pausable: paused");
        });
    });

    describe("ERC20 Standard", function () {
        const transferAmount = parseEther("100");

        beforeEach(async function () {
            await token.transfer(user.address, parseEther("1000"));
        });

        it("Should transfer tokens between accounts", async function () {
            await token.connect(user).transfer(userTwo.address, transferAmount);
            expect(await token.balanceOf(userTwo.address)).to.equal(transferAmount);
        });

        it("Should fail if sender doesn't have enough tokens", async function () {
            await expect(
                token.connect(user).transfer(userTwo.address, parseEther("2000"))
            ).to.be.revertedWith("ERC20: transfer amount exceeds balance");
        });

        it("Should update allowances on approve", async function () {
            await token.connect(user).approve(userTwo.address, transferAmount);
            expect(await token.allowance(user.address, userTwo.address))
                .to.equal(transferAmount);
        });

        it("Should transfer tokens using transferFrom", async function () {
            await token.connect(user).approve(userTwo.address, transferAmount);
            await token.connect(userTwo).transferFrom(
                user.address,
                userTwo.address,
                transferAmount
            );
            expect(await token.balanceOf(userTwo.address)).to.equal(transferAmount);
        });
    });
});