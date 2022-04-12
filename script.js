const settings = { //General configuration settings for the program (modify this to easily modify the program)
  /*GENERAL SETTINGS*/
  canvasSize: 500,
  backgroundColor: "cyan",

  features: {
    addFish: true, //Allow or Disallow the add fish feature, which lets users spawn in fish with a color of their choice
    allowReturnFishFromBucket: true, //Allow or disallow users to take fish from their collected fish bucket, and return them to the pond source
    removeZeroFish: true, //Automatically remove listings of fish populations (colors) from the UI that have been reduced to zero (false will keep those populations listed as 0)
  },
  starting: {
    colors: ["orange", "lightgreen"], //Possible colors for the fish to start
    min:8,
    max:14,
  },
  availableColors: ["orange", "lightgreen", "red", "yellow", "white"], //Possible colors to add

  pondWidth: 200,
  pondHeight: 260,

  tank: {
    waterColor: "blue",
    highlightColor: "#FFFF0050",
    doWaves: true,
    waterLevel: 40, //How high the water is in the tank
    waveSpeed: .15, //Modifier for how fast the water ripples go
    waveSize: 10, //The amplitude of the water ripples
  },
  dock: {
    height: 280,
    color: "brown"
  },

  /*ADVANCED FEATURES (These don't really need to be changed)*/
  fish: {
    width: 25,
    height: 12.5,
    tailLength:10,
    detectionMargin:45, //The distance fish "see" an obstacle to turn around (only relevant while swimming). It cannot be changed on a per fish basis.
    swimSpeed: 0.75, //How fast the swim
  },
  interface: {
    tableSpacing: 55,
    tableRowHeight: 20,
    tutorialTextMargin: 20,
    addFishButtonSpacing: 20
  },
  fisherman: {
    //Sayings
    dialogueEnabled: true,
    dialogueLines_catch: ["Woah, a big one!", "I feel a nibble!", "Wow, what a beauty!"],
    dialogueLines_bucket: ["A great addition to my aquarium.", "What a catch!", "Great job!"],
    dialogueDuration: 1000,

    //Colors
    skinColor: "#FFCC99",
    shirtColor: "green",
    pantColor: "purple",
    hatColor: "yellow",
    rodColor: "brown",
    lineColor: "black",
    reelColor: "#808080",

    //Sizes
    torsoWidth: 45,
    torsoHeight: 100,
    armLength: 75,
    thighLength: 35,
    shinLength: 40,
    limbWidth: 10,
    handSize: 15,
    reelSize: 5,
    reelSpeed: 1,
    reelRadius: 5,
    footLength: 30,
    footHeight: 10,
    headSize: 45,
    breathSpeed: .03,
    rodWeight: 4,
    lineWeight: 1,
    cornerRounding: 5,
    rodHandleLength: 50,
    rodHeightOverWater: 200,

  },
  //Import settings into an object
  import: function(destination, source) {
    for(var key in source) destination[key] = source[key]; //Unpack the source properties into the source
  }
}

//A helper function to make generating random values easier
function rand(min, max) { //Inclusive, exclusive
  return Math.floor(Math.random() * (max - min)) + min;
}

var gameObjects = { //Stores the classes used to create objects in the game
  tank: function(xpos, ypos, width, height) { //The class that manages the bodies (tanks) of water

    //Put constructor parameters into the class, in case they need to be modified later (ex. "myTank.width *=2" would double the width of the tank"
    this.xpos = xpos;
    this.ypos = ypos;
    this.width = width;
    this.height = height;

    //Set default configurations
    this.drawBorders = true;
    this.fish = [];
    this.fishQuantities = {};
    this.canPickUp = this.canPutDown = true;

    settings.import(this, settings.tank) //We copy from settings for flexibility - so that the instance can be reconfigured on an individual basis, if needed

    //Keep track of all the tanks in the "game", for detecting mouse clicks & mouse hover
    if(gameObjects.allTanks === undefined) gameObjects.allTanks = [];
    gameObjects.allTanks.push(this)

    this.update = function() {
      if(this.drawBorders) {
        //Draw the outline of the tank
        fill(settings.backgroundColor);
        stroke("black");
        rect(this.xpos, this.ypos, this.width, this.height)

        //Remove the top of the outline such that the tank is open
        noStroke();
        rect(this.xpos, this.ypos - 5, this.width, 10)
      } else noStroke();

      //Draw the still water within the tank
      fill(this.waterColor);
      rect(this.xpos, this.ypos + this.waterLevel, this.width, this.height - this.waterLevel)

      //Render the waves on top of the water
      if(this.doWaves) {
        var startingWave = this.xpos + (this.waveSize / 2);
        for(var x = startingWave; x <= (this.xpos + this.width) - (this.waveSize / 2); x += (this.waveSize / 2) ) {
          var y = Math.sin((x - startingWave) + (frameCount * this.waveSpeed)) + this.ypos + this.waterLevel;
          circle(x, y, this.waveSize);
        }
      }

      //Render the mouse over highlight
      if(this.isMouseOver()) {
        if((this.canPickUp && grabbedFish === undefined) || (this.canPutDown && grabbedFish !== undefined)) { //Only render if settings allow, and the user is in the right mode (has or has not grabbed a fish)
          fill(this.highlightColor)
          rect(this.xpos, this.ypos, this.width, this.height)
        }
      }

      //The tank is the controller class for all the fish contained within. Therefore, it bears the responsibility of updating all the fish it has.
      for(var i = 0; i < this.fish.length; i++) {
        this.fish[i].update();
      }
    }
    this.addFish = function(fish) {

      //The bounds of the tank
      var min_xpos = this.xpos + fish.width;
      var max_xpos = (this.xpos + this.width) - fish.width;
      var min_ypos = this.ypos + this.waterLevel + fish.height;
      var max_ypos = (this.ypos + this.height) - fish.height;

      //Position the fish at a random point inside the tank
      if(fish.xpos === undefined || fish.ypos === undefined) {
        fish.xpos = rand(min_xpos, max_xpos);
        fish.ypos = rand(min_ypos, max_ypos);
      }
      else {
        if(fish.xpos < min_xpos) fish.xpos = min_xpos;
        if(fish.xpos > max_xpos) fish.xpos = max_xpos;
        if(fish.ypos < min_ypos) fish.ypos = min_ypos;
        if(fish.ypos > max_ypos) fish.ypos = max_ypos;
      }

      //Calculate which direction the fish should be facing. True is right, false is left.
      fish.rotation = (fish.xpos > this.xpos + (this.width / 2)) * 180 //The fish will go right if it's on the right side of the tank, or left if it's on the left side of the tank

      fish.wander = true; //Allow the fish to swim back and forth
      fish.lowerSwimBound = this.xpos; //How far it can swim to the left
      fish.upperSwimBound = this.xpos + this.width; //How far it can swim to the right

      this.fish.push(fish) //Add the fish to the tank array, so that the tank can keep track of it

      //Keep track of the quantity of each fish color
      if(this.fishQuantities[fish.color] === undefined) this.fishQuantities[fish.color] = 0;
      this.fishQuantities[fish.color]++;
    }
    this.removeFish = function(fish) {

      fish.wander = false; //Stop the fish from swimming

      fish.lowerSwimBound = fish.upperSwimBound = undefined; //Remove this data, because it is only relevant to the tank the fish is no longer in!

      //Subtract from the fish total
      if(this.fishQuantities[fish.color] !== undefined) {
        this.fishQuantities[fish.color]--;
        if(settings.features.removeZeroFish && this.fishQuantities[fish.color] <= 0) delete this.fishQuantities[fish.color];
      }
      this.fish.splice(this.fish.indexOf(fish), 1); //Ultimately removes the fish from the tank's domain
    }
    this.isMouseOver = function() {
      if(mouseX > this.xpos && mouseX < this.xpos + this.width && mouseY > this.ypos && mouseY < this.ypos + this.height) {
        return true;
      }
      else return false;
    }
  },
  fish: function(color) {

    //Put constructor parameters into the class, in case they need to be modified later (ex. to change the color of the fish)
    this.color = color;

    //Set default configurations
    this.rotation = 0;
    this.wander = false; //This denotes if the fish should try to "wander" idley - swim back and forth within its tank
    this.canPickUp = true;

    settings.import(this, settings.fish) //We copy from settings for flexibility - so that the instance can be reconfigured on an individual basis, if needed

    this.update = function() {
      push() //Set up isolated graphics instance so settings here don't affect the global scope
      fill(this.color)

      //Re align the graphics for rotation about the center of the fish
      ellipseMode(CENTER)
      translate(this.xpos, this.ypos)
      rotate(radians(this.rotation));

      //Draw the body of the fish
      ellipse(0, 0, this.width, this.height)

      //Draw the tail of the fish
      triangle(this.width / 2, 0, (this.width / 2) + this.tailLength, this.tailLength, (this.width / 2) + this.tailLength, -this.tailLength);

      //Cap the rotation value at 360 degrees (full circle)
      if(this.rotation >= 360) this.rotation = 0;

      pop() //Release graphics instance

      //Swimming back and forth
      if(this.wander) {
        if(this.rotation == 0) {
          this.xpos -= this.swimSpeed;
          if(this.xpos <= this.lowerSwimBound + this.detectionMargin) this.rotation = 180;
        }
        else {
          this.xpos += this.swimSpeed
          if(this.xpos >= this.upperSwimBound - this.detectionMargin) this.rotation = 0;
        }
      }

    }

    this.isMouseOver = function() {
      if((this.rotation == 0 && mouseX > this.xpos - (this.width / 2) && mouseX < this.xpos + (this.width / 2) && mouseY > this.ypos - (this.height / 2) && mouseY < this.ypos + (this.height / 2))) { //Check if the mouse is within a hitbox around the fish, when the fish is facing LEFT
        return true;
      }
      else if((this.rotation == 180 && mouseX < this.xpos + (this.width / 2) && mouseX > this.xpos - (this.width / 2) && mouseY > this.ypos && mouseY < this.ypos + (this.height / 2))) { //Check if the mouse is within a hitbox around the fish, when the fish is facing RIGHT (The hitbox is reversed)
        return true;
      }
      else {
        return false;
      }
    }

  },
  fisherman: function(xpos, ypos, source, destination) {
    //Put constructor parameters into the class, in case they need to be modified later
    this.xpos = xpos;
    this.ypos = ypos;
    this.source = source;
    this.destination = destination;

    //Set default configurations
    settings.import(this, settings.fisherman) //We copy from settings for flexibility - so that the instance can be reconfigured on an individual basis, if needed

    this.update = function() {
      push();
      translate(this.xpos, this.ypos)
      rectMode(CENTER)

      //Seat
      fill(this.pantColor)
      circle(0, 0, this.torsoWidth)

      //Body
      fill(this.shirtColor)
      rect(0, -(this.torsoHeight / 2), this.torsoWidth, this.torsoHeight, this.cornerRounding, this.cornerRounding, 0, 0)

      //Head
      var headX = 0;
      var headY = -(this.torsoHeight) - (this.headSize / 4) + (2 * Math.sin(frameCount * this.breathSpeed)); //Sine wave makes the fisherman "breathe" by subtly moving his head up and down
      fill(this.skinColor)
      circle(headX, headY, this.headSize);

      //Hat
      fill(this.hatColor)
      arc(headX, headY, this.headSize, this.headSize, PI, 0); //Top of the hat - Draw a semicircle atop the head
      ellipse(headX, headY, this.headSize * 2, this.headSize / 4) //Brim of the hat

      //Calculate position of the hand, to simplify calculations for the next few objects (hand, arm, fishing rod)
      var handX = -(this.torsoWidth / 6) - this.armLength;
      var handY = -(this.torsoWidth * 1.25) + (this.limbWidth / 2);

      rectMode(CORNER)
      translate(handX, handY) //We are now rendering relative to the palm of the hand (hand is at [0, 0])

      //Arm
      fill(this.shirtColor)
      rect(0, -this.limbWidth / 2, this.armLength, this.limbWidth, this.cornerRounding, 0, 0, this.cornerRounding) //Rounded "knee" vertex

      //Fishing rod
      stroke(this.rodColor)
      strokeWeight(this.rodWeight)
      var rodTipX = this.source.xpos + (this.source.width / 2) - handX - this.xpos; //The last part of these calculations (- handX - this.xpos) effectively remove the translation, so that we can position the tip of the rod (and ONLY the tip of the rod) objectively, not relatively
      var rodTipY = this.source.ypos - this.rodHeightOverWater - handY - this.ypos;
      line(0, 0, rodTipX, rodTipY); //This is the top half of the rod, from tip to hand

      //To extend the rod beyond the hand (rodHandleLength), we'll need to use an angle and a vector since we don't have objective coordinates
      var rodAngle = atan2(-rodTipY, -rodTipX); //Find the angle of the rod so far (so we can extend at the same angle and form a straight line for the handle)

      var v = p5.Vector.fromAngle(rodAngle, this.rodHandleLength); //Add the rod handle with the same angle
      line(0, 0, v.x, v.y); //Draw the handle (extension)

      //The reel
      if(this.reeling) {
        push();
        rotate(Math.sqrt(Math.pow(rodTipX - mouseX, 2) + Math.pow(rodTipY - mouseY, 2)) * this.reelSpeed) //The reel responds to the length of the fishing line, (a^2 + b^2 = c^2) which varies as the mouth is moved
        fill(this.reelColor);
        circle(this.reelRadius, this.reelRadius, this.reelSize);
        pop();
      }

      //Hand
      noStroke();
      fill(this.skinColor);
      circle(0, 0, this.handSize);

      //Fishing line
      translate(rodTipX, rodTipY)
      stroke(this.lineColor)
      strokeWeight(this.lineWeight)

      var fishhookAnchorX = this.source.xpos + (this.source.width / 2) - handX - this.xpos; //The last part of these calculations (- handX - this.xpos) effectively remove the translation, so that we can find the objective position of the water line
      var fishhookAnchorY = this.source.ypos + this.source.waterLevel - handY - this.ypos;
      if(this.reeling !== undefined) { //If we're holding a fish, attach the fishing line to the fish
        fishhookAnchorX = this.reeling.xpos - handX - this.xpos;
        fishhookAnchorY = this.reeling.ypos - handY - this.ypos;
      }
      line(0, 0, fishhookAnchorX - rodTipX, fishhookAnchorY - rodTipY) //Draw the fishing line

      pop() //Return to objective coordinates and reset rotation

      //Thigh
      fill(this.pantColor)
      rect(this.xpos - this.thighLength + (this.torsoWidth / 6), this.ypos + (this.torsoWidth / 6), this.thighLength, this.limbWidth, this.cornerRounding, 0, 0, 0) //Rounded "knee" vertex

      //Shin
      push();
      translate(this.xpos - this.thighLength + (this.torsoWidth / 6), this.ypos + (this.torsoWidth / 6)) //Establish a new origin point so that we can rotate at the knee
      rotate(radians(4 * Math.sin(frameCount * this.breathSpeed))) //Rotate back and forth slightly at the knee

      rect(0, 0, this.limbWidth, this.shinLength, this.cornerRounding, 0, 0, 0) //Draw the shin

      //Foot
      fill(this.skinColor)
      ellipse(-(this.limbWidth / 2), this.shinLength, this.footLength, this.footHeight)

      pop(); //Stop anchoring at the knee, return to objective positioning

      //Dialogue text (if available)
      if(this.dialogue !== undefined) {
        fill("black")
        text(this.dialogue, this.xpos + this.torsoWidth, this.ypos - this.torsoHeight - (this.headSize / 2))

        if(performance.now() - this.dialogueAppeared >= this.dialogueDuration) { //Track how long a given line of dialogue has been on screen, and remove it once it expires
          this.dialogue = undefined;
        }
      }

    },

    this.speakFromArray = function(array) {
      if(this.dialogueEnabled) {
        this.dialogue = array[rand(0, array.length)]; //Get a random line of dialogue
        this.dialogueAppeared = performance.now(); //Reset the timer that tracks how long the dialogue has been on screen
      }
    }
  }
}

/*These global variables serve as the main instances for the objects in our scene.
They are not initialized until setup() for safety reasons.*/
var pond = undefined;
var bucket = undefined;
var fisherman = undefined;
var sampleFish = undefined; //The fish in the "addFish" UI
var interfaceAnchorX = undefined; //The left alignment of the main UI
var grabbedFish = undefined;

function setup() {
  //Build a new canvas (to be used for p5.js)
  var canvas = createCanvas(settings.canvasSize, settings.canvasSize)
  canvas.parent("canvasContainer")

  background(settings.backgroundColor)

  //Create the pond
  pond = new gameObjects.tank(0, settings.canvasSize - settings.pondHeight, settings.pondWidth, settings.pondHeight);
  pond.drawBorders = false;

  //Position where the interfaces will align-left
  interfaceAnchorX = pond.width + 10;

  //Create the bucket for the fisherman to store caught fish
  bucket = new gameObjects.tank(settings.canvasSize - 140, settings.canvasSize - settings.dock.height - 100, 110, 100);
  bucket.canPickUp = settings.features.allowReturnFishFromBucket; //Disable picking up a fish from this bucket if specified in settings

  //Create the fisherman
  fisherman = new gameObjects.fisherman(settings.pondWidth + 15, settings.canvasSize - settings.dock.height - (settings.fisherman.torsoWidth / 2), pond, bucket)

  //Create the "Add Fish" user interface (Does not need to be continuously rendered)
  if(settings.features.addFish) buildAddFishInterface();

  //Populate the pond with some fish, to start
  populateStarting(pond)
}

function draw() {
  background(settings.backgroundColor) //Clear the screen

  //Render the main objects
  pond.update();
  bucket.update();
  fisherman.update();

  //Draw the dock where the fisherman sits, and the base of the UI
  fill(settings.dock.color);
  rect(settings.pondWidth, settings.canvasSize - settings.dock.height, settings.canvasSize - settings.pondWidth, settings.dock.height, 5, 0, 0, 0);

  //Render the main UI
  if(sampleFish !== undefined) sampleFish.update();
  renderProbabilityInterface(pond, interfaceAnchorX, (settings.canvasSize - settings.dock.height) + 40);

  //Set up for the tutorial text (below)
  fill("black")
  textSize(14);

  //If the user is holding a fish, render that
  if(grabbedFish !== undefined) {
    grabbedFish.xpos = mouseX;
    grabbedFish.ypos = mouseY - (grabbedFish.width / 2);
    grabbedFish.update()

    fisherman.reeling = grabbedFish;

    text("You caught a fish! Release it by clicking on your bucket.", settings.interface.tutorialTextMargin, settings.interface.tutorialTextMargin) //Render tutorial text
  }
  else {
    fisherman.reeling = undefined;
    text("Click on a fish to catch it.", settings.interface.tutorialTextMargin, settings.interface.tutorialTextMargin); //Render tutorial text
  }

}

function renderProbabilityInterface(pond, x, y) {
  fill("black")
  textSize(14);

  if(pond.fish.length > 0) { //Optimization: Only render probabilities if there are fish at all

    var verb = "are"
    if(pond.fish.length == 1) verb = "is"
    text("There " + verb + " " + pond.fish.length + " fish in the pond.", x, y);

    var rowPositionY = y + settings.interface.tableRowHeight;

    //Render the labels for each collumn along the top of the table
    textSize(10)
    text("Color", x, rowPositionY);
    text("#", x + (settings.interface.tableSpacing * 2), rowPositionY);
    text("Prob.", x + (settings.interface.tableSpacing * 3), rowPositionY);
    text("Percent", x + (settings.interface.tableSpacing * 4), rowPositionY);

    rowPositionY += settings.interface.tableRowHeight; //Move down to the first row position

    for(var color in pond.fishQuantities) { //Iterate through all available colors
      textSize(14);
      fill(color);

      //Render collumn 0 - the color name
      text(color.toUpperCase().replace("LIGHT", ""), x, rowPositionY);

      //Render collumn 1 - the quantity
      text(pond.fishQuantities[color], x + (settings.interface.tableSpacing * 2), rowPositionY);

      //Render collumn 2 - the fractional probability
      text(pond.fishQuantities[color] + "/" + pond.fish.length, x + (settings.interface.tableSpacing * 3), rowPositionY);

      //Render collumn 3 - the percent chance
      var percent = ((pond.fishQuantities[color] / pond.fish.length) * 100)
      if(percent > 1.00) percent = Math.round(percent) //Round the percentage to a whole number, unless it is only a decimal
      else if(percent > 0.00) percent = percent.toFixed(2); //If the percentage is a decimal less than 1, show to the hundreths place

      text(percent + "%", x + (settings.interface.tableSpacing * 4), rowPositionY);

      //Move to the next row
      rowPositionY += settings.interface.tableRowHeight;
    }
  } else text("The pond is empty. Add some fish below!", x, y);
}

function buildAddFishInterface() { //This function builds the "Add Fish" button and its associated color buttons. Note that this only needs to be run once, since buttons are stored directly in HTML DOM.
  const buttonRowY = settings.canvasSize - 40;

  //Create a sample fish to showcase which color is currently loaded for insertion
  sampleFish = new gameObjects.fish(settings.availableColors[0]);
  sampleFish.xpos = interfaceAnchorX + sampleFish.width;
  sampleFish.ypos = buttonRowY - 40;

  //The addFish button itself
  var addFishButton = createButton('Add'); //This button adds a fish with the same color as the sample fish
  addFishButton.position(interfaceAnchorX + ((settings.availableColors.length + 1) * 20), buttonRowY);
  addFishButton.size(undefined, 23)
  addFishButton.mousePressed(function() {
    var f = new gameObjects.fish(sampleFish.color)
    pond.addFish(f);
  });

  //This iteratively creates a series of buttons that serve as "color swatches" to select which color to add
  for(let c = 0; c < settings.availableColors.length; c++) {
    colorSwatch = createButton('  '); //Create a button with no text
    colorSwatch.style('background-color', settings.availableColors[c]); //Fill the button with the color it corresponds to
    colorSwatch.position(interfaceAnchorX + ((c + 1) * settings.interface.addFishButtonSpacing), buttonRowY);
    colorSwatch.size(undefined, 23);
    onPress = function() {
      sampleFish.color = settings.availableColors[c];
    }
    colorSwatch.mousePressed(onPress);
  }
}

//Fills the pond with a random assortment of fish
function populateStarting(pond) {
  for(var i = 0; i <= rand(settings.starting.min, settings.starting.max + 1); i++) {
    var color = settings.starting.colors[rand(0, settings.starting.colors.length)]; //Choose a random color from the list of possible colors

    var f = new gameObjects.fish(color)
    pond.addFish(f);
  }
}

function mouseClicked() {
  var clickedWater = undefined;

  //Find which body of water the user clicked on
  for(var i = 0; i < gameObjects.allTanks.length; i++) {
    if(gameObjects.allTanks[i].isMouseOver()) {
      clickedWater = gameObjects.allTanks[i];
    }
  }

  if(clickedWater !== undefined) { //If the user clicked on a body of water at all

    if(grabbedFish === undefined && clickedWater.canPickUp) { //If the user is not holding a fish, try to pick one up
      for(var i = 0; i < clickedWater.fish.length && grabbedFish === undefined; i++) { //Find which fish was clicked on

        if(clickedWater.fish[i].canPickUp && clickedWater.fish[i].isMouseOver()) {
          //Since the fish was clicked, we can remove it from the pond and add it to the fisherman/mouse
          clickedWater.fish[i].rotation = 90;
          grabbedFish = clickedWater.fish[i];
          clickedWater.removeFish(clickedWater.fish[i]);
          if(clickedWater === pond) fisherman.speakFromArray(settings.fisherman.dialogueLines_catch)
        }

      }
    } else if(clickedWater && clickedWater.canPutDown) { //If the user is holding a fish, try to release it into the water
      clickedWater.addFish(grabbedFish)
      grabbedFish = undefined;
      if(clickedWater === bucket) fisherman.speakFromArray(settings.fisherman.dialogueLines_bucket)
    }
  }
}
