const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("MockToken (tSGL)", function () {
  it("Deve fazer o deploy com o supply inicial correto", async function () {
    const [owner] = await ethers.getSigners();
    const Token = await ethers.getContractFactory("MockToken");
    const token = await Token.deploy(ethers.utils.parseEther("1000000"));
    await token.deployed();

    expect(await token.totalSupply()).to.equal(ethers.utils.parseEther("1000000"));
    expect(await token.balanceOf(owner.address)).to.equal(ethers.utils.parseEther("1000000"));
  });

  it("Deve transferir tokens entre contas", async function () {
    const [owner, user] = await ethers.getSigners();
    const Token = await ethers.getContractFactory("MockToken");
    const token = await Token.deploy(ethers.utils.parseEther("1000000"));
    await token.deployed();

    await token.transfer(user.address, ethers.utils.parseEther("100"));
    expect(await token.balanceOf(user.address)).to.equal(ethers.utils.parseEther("100"));
  });

  it("Não deve permitir transferir mais do que o saldo", async function () {
    const [owner, user] = await ethers.getSigners();
    const Token = await ethers.getContractFactory("MockToken");
    const token = await Token.deploy(ethers.utils.parseEther("1000"));
    await token.deployed();

    await expect(
      token.connect(user).transfer(owner.address, ethers.utils.parseEther("1"))
    ).to.be.revertedWith("ERC20: transfer amount exceeds balance");
  });
});
