const { expect } = require("chai");
const { ethers } = require("hardhat");


describe("Message", function () {
    let Message;
    let message;
    let owner;
    let creator;
    let recipient;
    let oracle;
    let other;

    const oneDay = 24 * 60 * 60;
    const oneYear = 365 * oneDay;
    const testIpfsCID = "QmTest123";
    const testTrigger = "DATE";
    
    beforeEach(async function () {
        [owner, creator, recipient, oracle, other] = await ethers.getSigners();
        Message = await ethers.getContractFactory("Message");
        message = await Message.deploy();
        await message.deployed();
    });

    describe("Message Creation", function () {
        it("Should create a message with valid parameters", async function () {
            const unlockTime = ( (await ethers.provider.getBlock("latest")).timestamp ) + oneYear;
            
            await message.connect(creator).createMessage(
                recipient.address,
                testIpfsCID,
                unlockTime,
                testTrigger
            );

            const messageContent = await message.messages(0);
            expect(messageContent.creator).to.equal(creator.address);
            expect(messageContent.recipient).to.equal(recipient.address);
            expect(messageContent.ipfsCID).to.equal(testIpfsCID);
            expect(messageContent.unlockTime).to.equal(unlockTime);
            expect(messageContent.delivered).to.be.false;
            expect(messageContent.trigger).to.equal(testTrigger);
            expect(messageContent.validated).to.be.false;
        });

        it("Should emit MessageCreated event", async function () {
            const unlockTime = ( (await ethers.provider.getBlock("latest")).timestamp ) + oneYear;
            
            await expect(
                message.connect(creator).createMessage(
                    recipient.address,
                    testIpfsCID,
                    unlockTime,
                    testTrigger
                )
            )
            .to.emit(message, "MessageCreated")
            .withArgs(0, creator.address, recipient.address, unlockTime, testTrigger);
        });

        it("Should fail with invalid recipient", async function () {
            const unlockTime = ( (await ethers.provider.getBlock("latest")).timestamp ) + oneYear;
            
            await expect(
                message.connect(creator).createMessage(
                    ethers.constants.AddressZero,
                    testIpfsCID,
                    unlockTime,
                    testTrigger
                )
            ).to.be.revertedWith("Invalid recipient");
        });

        it("Should fail with invalid IPFS CID", async function () {
            const unlockTime = ( (await ethers.provider.getBlock("latest")).timestamp ) + oneYear;
            
            await expect(
                message.connect(creator).createMessage(
                    recipient.address,
                    "",
                    unlockTime,
                    testTrigger
                )
            ).to.be.revertedWith("Invalid IPFS CID");
        });

        it("Should fail with past unlock time", async function () {
            const unlockTime = ( (await ethers.provider.getBlock("latest")).timestamp ) - oneDay;
            
            await expect(
                message.connect(creator).createMessage(
                    recipient.address,
                    testIpfsCID,
                    unlockTime,
                    testTrigger
                )
            ).to.be.revertedWith("Invalid unlock time");
        });

        it("Should fail with too far unlock time", async function () {
            const unlockTime = ( (await ethers.provider.getBlock("latest")).timestamp ) + (101 * oneYear);
            
            await expect(
                message.connect(creator).createMessage(
                    recipient.address,
                    testIpfsCID,
                    unlockTime,
                    testTrigger
                )
            ).to.be.revertedWith("Unlock time too far");
        });
    });

    describe("Message Unlocking", function () {
        let messageId;
        let unlockTime;

        beforeEach(async function () {
            unlockTime = ( (await ethers.provider.getBlock("latest")).timestamp ) + oneYear;
            await message.connect(creator).createMessage(
                recipient.address,
                testIpfsCID,
                unlockTime,
                testTrigger
            );
            messageId = 0;
        });

        it("Should unlock message after unlock time without trigger", async function () {
            await ethers.provider.send("evm_increaseTime", [oneYear + oneDay]); await ethers.provider.send("evm_mine");
            
            await message.connect(recipient).unlockMessage(messageId);
            
            const messageContent = await message.messages(messageId);
            expect(messageContent.delivered).to.be.true;
        });

        it("Should fail unlock before time", async function () {
            await expect(
                message.connect(recipient).unlockMessage(messageId)
            ).to.be.revertedWith("Message not yet unlocked");
        });

        it("Should fail unlock by non-recipient", async function () {
            await ethers.provider.send("evm_increaseTime", [oneYear + oneDay]); await ethers.provider.send("evm_mine");
            
            await expect(
                message.connect(other).unlockMessage(messageId)
            ).to.be.revertedWith("Not message recipient");
        });

        it("Should fail double unlock", async function () {
            await ethers.provider.send("evm_increaseTime", [oneYear + oneDay]); await ethers.provider.send("evm_mine");
            await message.connect(recipient).unlockMessage(messageId);
            
            await expect(
                message.connect(recipient).unlockMessage(messageId)
            ).to.be.revertedWith("Message already delivered");
        });

        it("Should require trigger validation if trigger exists", async function () {
            await ethers.provider.send("evm_increaseTime", [oneYear + oneDay]); await ethers.provider.send("evm_mine");
            
            await expect(
                message.connect(recipient).unlockMessage(messageId)
            ).to.be.revertedWith("Trigger not validated");
        });
    });

    describe("Oracle Management", function () {
        it("Should add oracle correctly", async function () {
            await message.addOracle(oracle.address, testTrigger);
            
            expect(await message.authorizedOracles(oracle.address)).to.be.true;
            expect(await message.triggerOracles(testTrigger)).to.equal(oracle.address);
        });

        it("Should remove oracle correctly", async function () {
            await message.addOracle(oracle.address, testTrigger);
            await message.removeOracle(oracle.address, testTrigger);
            
            expect(await message.authorizedOracles(oracle.address)).to.be.false;
            expect(await message.triggerOracles(testTrigger)).to.equal(ethers.constants.AddressZero);
        });

        it("Should only allow owner to manage oracles", async function () {
            await expect(
                message.connect(other).addOracle(oracle.address, testTrigger)
            ).to.be.revertedWith("OwnableUnauthorizedAccount");
        });
    });

    describe("Trigger Validation", function () {
        let messageId;
        let proofHash;

        beforeEach(async function () {
            const unlockTime = ( (await ethers.provider.getBlock("latest")).timestamp ) + oneYear;
            await message.connect(creator).createMessage(
                recipient.address,
                testIpfsCID,
                unlockTime,
                testTrigger
            );
            messageId = 0;
            proofHash = ethers.utils.id("test-proof");
            await message.addOracle(oracle.address, testTrigger);
        });

        it("Should validate trigger correctly", async function () {
            await message.connect(oracle).validateTrigger(messageId, proofHash);
            
            const messageContent = await message.messages(messageId);
            expect(messageContent.validated).to.be.true;
            expect(messageContent.proofHash).to.equal(proofHash);
        });

        it("Should emit TriggerValidated event", async function () {
            await expect(
                message.connect(oracle).validateTrigger(messageId, proofHash)
            )
            .to.emit(message, "TriggerValidated")
            .withArgs(messageId, testTrigger, proofHash);
        });

        it("Should only allow authorized oracle to validate", async function () {
            await expect(
                message.connect(other).validateTrigger(messageId, proofHash)
            ).to.be.revertedWith("Not authorized oracle");
        });
    });

    describe("Message Queries", function () {
        beforeEach(async function () {
            const unlockTime = ( (await ethers.provider.getBlock("latest")).timestamp ) + oneYear;
            await message.connect(creator).createMessage(
                recipient.address,
                testIpfsCID,
                unlockTime,
                testTrigger
            );
        });

        it("Should return correct pending messages", async function () {
            const pending = await message.getPendingMessages(recipient.address);
            expect(pending.length).to.equal(1);
            expect(pending[0]).to.equal(0);
        });

        it("Should return correct user messages", async function () {
            const userMessages = await message.getUserMessages(creator.address);
            expect(userMessages.length).to.equal(1);
            expect(userMessages[0]).to.equal(0);
        });
    });

    describe("Pausable", function () {
        it("Should pause and unpause correctly", async function () {
            await message.pause();
            expect(await message.paused()).to.be.true;

            await message.unpause();
            expect(await message.paused()).to.be.false;
        });

        it("Should prevent operations when paused", async function () {
            await message.pause();
            
            const unlockTime = ( (await ethers.provider.getBlock("latest")).timestamp ) + oneYear;
            await expect(
                message.connect(creator).createMessage(
                    recipient.address,
                    testIpfsCID,
                    unlockTime,
                    testTrigger
                )
            ).to.be.revertedWith("EnforcedPause");
        });

        it("Should only allow owner to pause/unpause", async function () {
            await expect(
                message.connect(other).pause()
            ).to.be.revertedWith("OwnableUnauthorizedAccount");
        });
    });
});