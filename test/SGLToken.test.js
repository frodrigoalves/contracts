const { expect } = require("chai");
const { ethers } = require("hardhat");
const { parseEther } = ethers.utils;

describe("SGLToken", function () {
    let SGLToken;
    let token;
    let owner;
    let admin;
    let minter;
    let user;
    let userTwo;

    const MINTER_ROLE = ethers.utils.keccak256(ethers.utils.toUtf8Bytes("MINTER_ROLE"));
    const BURNER_ROLE = ethers.utils.keccak256(ethers.utils.toUtf8Bytes("BURNER_ROLE"));
    const initialSupply = parseEther("100000000"); // 100M tokens

    beforeEach(async function () {
        [owner, admin, minter, user, userTwo] = await ethers.getSigners();
        SGLToken = await ethers.getContractFactory("SGLToken");
        token = await SGLToken.deploy(admin.address, initialSupply);
        await token.deployed();
    });

    describe("Deployment", function () {
        it("Should assign initial supply to admin", async function () {
            expect(await token.balanceOf(admin.address)).to.equal(initialSupply);
        });

        it("Should set up roles correctly", async function () {
            expect(await token.hasRole(MINTER_ROLE, admin.address)).to.be.true;
            expect(await token.hasRole(await token.DEFAULT_ADMIN_ROLE(), admin.address)).to.be.true;
        });

        it("Should have correct name and symbol", async function () {
            expect(await token.name()).to.equal("SingulAI Token");
            expect(await token.symbol()).to.equal("SGL");
        });
    });

    describe("Role Management", function () {
        it("Should allow admin to grant minter role", async function () {
            await token.connect(admin).grantRole(MINTER_ROLE, minter.address);
            expect(await token.hasRole(MINTER_ROLE, minter.address)).to.be.true;
        });

        it("Should prevent non-admin from granting roles", async function () {
            await expect(
                token.connect(user).grantRole(MINTER_ROLE, minter.address)
            ).to.be.revertedWith("AccessControl:");
        });
    });

    describe("Minting", function () {
        beforeEach(async function () {
            await token.connect(admin).grantRole(MINTER_ROLE, minter.address);
        });

        it("Should allow minter to mint tokens", async function () {
            const mintAmount = parseEther("1000");
            await token.connect(minter).mint(user.address, mintAmount);
            expect(await token.balanceOf(user.address)).to.equal(mintAmount);
        });

        it("Should prevent non-minter from minting", async function () {
            await expect(
                token.connect(user).mint(user.address, parseEther("1000"))
            ).to.be.revertedWith("AccessControl:");
        });
    });

    describe("Transfers with Burn", function () {
        const transferAmount = parseEther("1000");
        const burnPercent = 2; // 2%

        beforeEach(async function () {
            await token.connect(admin).transfer(user.address, transferAmount);
        });

        it("Should burn correct percentage on transfer", async function () {
            const burnAmount = transferAmount.mul(burnPercent).div(100);
            const sendAmount = transferAmount.sub(burnAmount);

            await expect(() => 
                token.connect(user).transfer(userTwo.address, transferAmount)
            ).to.changeTokenBalances(
                token,
                [user.address, userTwo.address],
                [transferAmount.mul(-1), sendAmount]
            );
        });

        it("Should emit TransferWithBurn event", async function () {
            const burnAmount = transferAmount.mul(burnPercent).div(100);

            await expect(token.connect(user).transfer(userTwo.address, transferAmount))
                .to.emit(token, "TransferWithBurn")
                .withArgs(user.address, ethers.constants.AddressZero, burnAmount);
        });

        it("Should reduce total supply by burn amount", async function () {
            const initialSupply = await token.totalSupply();
            const burnAmount = transferAmount.mul(burnPercent).div(100);

            await token.connect(user).transfer(userTwo.address, transferAmount);

            expect(await token.totalSupply()).to.equal(initialSupply.sub(burnAmount));
        });
    });

    describe("Pausable", function () {
        it("Should allow admin to pause", async function () {
            await token.connect(admin).pause();
            expect(await token.paused()).to.be.true;
        });

        it("Should allow admin to unpause", async function () {
            await token.connect(admin).pause();
            await token.connect(admin).unpause();
            expect(await token.paused()).to.be.false;
        });

        it("Should prevent transfers when paused", async function () {
            await token.connect(admin).pause();
            await expect(
                token.connect(admin).transfer(user.address, parseEther("1000"))
            ).to.be.revertedWith("EnforcedPause");
        });

        it("Should prevent non-admin from pausing", async function () {
            await expect(
                token.connect(user).pause()
            ).to.be.revertedWith("AccessControl:");
        });
    });

    describe("ERC20 Standard", function () {
        beforeEach(async function () {
            await token.connect(admin).transfer(user.address, parseEther("1000"));
        });

        it("Should allow approval and transferFrom", async function () {
            const amount = parseEther("100");
            await token.connect(user).approve(userTwo.address, amount);
            
            await token.connect(userTwo).transferFrom(
                user.address,
                userTwo.address,
                amount
            );

            const burnAmount = amount.mul(2).div(100);
            const expectedAmount = amount.sub(burnAmount);
            expect(await token.balanceOf(userTwo.address)).to.equal(expectedAmount);
        });

        it("Should update allowance correctly", async function () {
            const amount = parseEther("100");
            await token.connect(user).approve(userTwo.address, amount);
            expect(await token.allowance(user.address, userTwo.address)).to.equal(amount);
        });

        it("Should fail when transferring more than balance", async function () {
            await expect(
                token.connect(user).transfer(userTwo.address, parseEther("2000"))
            ).to.be.revertedWith("ERC20: transfer amount exceeds balance");
        });

        it("Should fail when transferring more than allowance", async function () {
            const amount = parseEther("100");
            await token.connect(user).approve(userTwo.address, amount);
            
            await expect(
                token.connect(userTwo).transferFrom(
                    user.address,
                    userTwo.address,
                    amount.mul(2)
                )
            ).to.be.revertedWith("ERC20: insufficient allowance");
        });
    });
});