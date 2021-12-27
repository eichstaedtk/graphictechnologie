var app = (function(){
  //WebGL Context Variable
  //view-source:https://menersar.github.io/ea7-z-bufferVisualisierung-main/
  var kugelModels = [];

  var simulationPaused = false;
  var simulationRunning = false;

  var speed = 50;

  var sound = true;

  var kugelnCanBecomeImmune;

  var myChart;



  // fillstyle
  var wireFrameFill = "wireframefill";
  var wireframe = "wireframe";
  var fill = "fill";


  var cSnow = [1., .98, 0.98, 1];

  var cKugelGreen = [0, .784, .318, 1];
  var cKugelRed = [1., .267, .267, 1];
  var cKugelBlue = [.2, .71, .898, 1];
  var cKugelYellow = [1, .733, .2, 1];

  var mBlue = createPhongMaterial({ kd: [.2, .71, .898] });
  var mYellow = createPhongMaterial({ kd: [1, .733, .2] });
  var mGreen = createPhongMaterial({ kd: [0, .784, .318] });
  var mRed = createPhongMaterial({ kd: [1., .267, .267] });
  var mSnow = createPhongMaterial({ kd: [1., .98, 0.98] });


  var rekursionsSchritt = 0;

  var gl;

  // The shader program object is also used to
  // store attribute and uniform locations.
  var prog;

  // Array of model objects.
  var models = [];

  var camLocked = false;

  let simulationInterval;

  var kugelRadius = .1;

  var sliderAnzahlKugelnN;
  var sliderAnzahlKrankeK;
  var sliderKugelRadiusR;
  var sliderGesundungsZeitschritteZ;

  var sliderSimulationsGeschwindigkeit;

  var valueAnzahlKugelnN;
  var valueAnzahlKrankeK;
  var valueAnzahlGesundeG;
  var valueKugelRadiusR;
  var valueGesundungsZeitschritteZ;

  var valueSimulationsGeschwindigkeit;

  var toggleWireframeOn = true;

  var deltaRotate = Math.PI / 36;
  var deltaTranslate = 0.05;

  var currentLightRotation = 0;

  var radiusLights = 5;

  //Global Camera Object
  var camera = {
    // Initial position of the camera.
    eye : [0, 1, 4],
    // Point to look at.
    center : [0, 0, 0],
    // Roll and pitch of the camera.
    up : [0, 1, 0],
    // Opening angle given in radian.
    // radian = degree*2*PI/360.
    fovy : 60.0 * Math.PI / 180,
    // Camera near grid dimensions:
    // value for left right top bottom in projection.
    lrtb : 2.0,
    // View matrix.
    vMatrix : mat4.create(),
    // Projection matrix.
    pMatrix : mat4.create(),
    // Projection types: ortho, perspective, frustum.
    projectionType : "perspective",
    // Angle to Z-Axis for camera when orbiting the center
    // given in radian.
    zAngle : 0,
    // Distance in XZ-Plane from center when orbiting.
    distance : 4,
  };

  var illumination = {
    ambientLight : [ .5, .5, .5 ],
    light : [
      {isOn:true, position:[radiusLights,1.,1.], color:[1.,1.,1.]},
    ]
  };

  function start() {
    console.log('Starting the Engine ... ')
    init();
    render();
  }

  function init() {
    console.log('Initialize the Engine ....')
    initWebGL();
    initShaderProgram();
    initUniforms()
    initModels();
    initEventHandler();
    initPipline();
  }

  function initWebGL() {
    console.log('Initialize the WebGL Context from Canvas ....')
    canvas = document.getElementById('c');
    gl = canvas.getContext('experimental-webgl');
    gl.viewportWidth = canvas.width;
    gl.viewportHeight = canvas.height;
  }

  function initPipline() {
    console.log('Initialize the Pipeline and Camera ....')
    gl.clearColor(.95, .95, .95, 1);

    gl.frontFace(gl.CCW);
    gl.enable(gl.CULL_FACE);
    gl.cullFace(gl.BACK);

    // Depth(Z)-Buffer.
    gl.enable(gl.DEPTH_TEST);

    // Polygon offset of rastered Fragments.
    gl.enable(gl.POLYGON_OFFSET_FILL);
    gl.polygonOffset(0.5, 0);

    // Set viewport.
    gl.viewport(0, 0, gl.viewportWidth, gl.viewportHeight);
    camera.aspect = gl.viewportWidth / gl.viewportHeight;
    camera.eye[1] = 1.91;
  }

  function initShaderProgram() {
    // Init vertex shader.
    var vs = initShader(gl.VERTEX_SHADER, "vertexshader");
    // Init fragment shader.
    var fs = initShader(gl.FRAGMENT_SHADER, "fragmentshader");
    // Link shader into a shader program.
    prog = gl.createProgram();
    gl.attachShader(prog, vs);
    gl.attachShader(prog, fs);
    gl.bindAttribLocation(prog, 0, "aPosition");
    gl.linkProgram(prog);
    gl.useProgram(prog);

  }

  function initShader(shaderType, SourceTagId) {
    var shader = gl.createShader(shaderType);
    var shaderSource = document.getElementById(SourceTagId).text;
    gl.shaderSource(shader, shaderSource);
    gl.compileShader(shader);
    if(!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      console.log(SourceTagId+": "+gl.getShaderInfoLog(shader));
      return null;
    }
    return shader;
  }

  function initUniforms() {
// Projection Matrix.
    prog.pMatrixUniform = gl.getUniformLocation(prog, "uPMatrix");

    // Model-View-Matrix.
    prog.mvMatrixUniform = gl.getUniformLocation(prog, "uMVMatrix");

    prog.colorUniform = gl.getUniformLocation(prog, "uColor");

    // die Uniform-Variable uNMatrix wird durch prog.nMatrixUniform referenziert
    prog.nMatrixUniform = gl.getUniformLocation(prog, "uNMatrix");

    prog.ambientLightUniform = gl.getUniformLocation(prog,
        "ambientLight");
    // Array for light sources uniforms.
    prog.lightUniform = [];
    // Loop over light sources.
    for (var j = 0; j < illumination.light.length; j++) {
      var lightNb = "light[" + j + "]";
      // Store one object for every light source.
      var l = {};
      l.isOn = gl.getUniformLocation(prog, lightNb + ".isOn");
      l.position = gl.getUniformLocation(prog, lightNb + ".position");
      l.color = gl.getUniformLocation(prog, lightNb + ".color");
      prog.lightUniform[j] = l;
    }

    // Material.
    prog.materialKaUniform = gl.getUniformLocation(prog, "material.ka");
    prog.materialKdUniform = gl.getUniformLocation(prog, "material.kd");
    prog.materialKsUniform = gl.getUniformLocation(prog, "material.ks");
    prog.materialKeUniform = gl.getUniformLocation(prog, "material.ke");
  }

  function createPhongMaterial(material){
    material = material || {};
    // Set some default values,
    // if not defined in material paramter.
    material.ka = material.ka || [0.3, 0.3, 0.3];
    material.kd = material.kd || [0.6, 0.6, 0.6];
    material.ks = material.ks || [0.8, 0.8, 0.8];
    material.ke = material.ke || 10.;

    return material;
  }

  function initModels() {
    createModel("plane", wireframe, cSnow, [0, -1, 0], [0, 0, 0], [1, 1, 1], mSnow);
    createModel("plane", wireframe, cSnow, [0, 1, 0], [0, 0, 0], [1, 1, 1], mSnow);

    createModel("plane", wireframe, cSnow, [0, -1, 0], [0, Math.PI, 0], [1, 1, 1], mSnow);
    createModel("plane", wireframe, cSnow, [0, 1, 0], [0, Math.PI, 0], [1, 1, 1], mSnow);


    createModel("plane", wireframe, cSnow, [-1, 0, 0], [0, 0, Math.PI * .5], [1, 1, 1], mSnow);
    createModel("plane", wireframe, cSnow, [1, 0, 0], [0, 0, Math.PI * .5], [1, 1, 1], mSnow);


    createModel("plane", wireframe, cSnow, [0, 0, -1], [0, Math.PI * 1.5, Math.PI * .5], [1, 1, 1], mSnow);
    createModel("plane", wireframe, cSnow, [0, 0, -1], [0, Math.PI * .5, Math.PI * .5], [1, 1, 1], mSnow);


  }

  function createModel(geometryname, fillstyle,color, translate, rotate, scale,material) {
    var model = {};
    model.fillstyle = fillstyle;
    model.color = color;
    model.material = material;

    initDataAndBuffers(model, geometryname);
    initTransformations(model, translate, rotate, scale);

    models.push(model);
  }

  function initTransformations(model, translate, rotate, scale) {
    // Store transformation vectors.
    model.translate = translate;
    model.rotate = rotate;
    model.scale = scale;

    model.nMatrix = mat3.create();

    // Create and initialize Model-Matrix.
    model.mMatrix = mat4.create();

    // Create and initialize Model-View-Matrix.
    model.mvMatrix = mat4.create();
  }

  function initDataAndBuffers(model, geometryname) {
    console.log('Init Data Buffer '+geometryname)
    // Provide model object with vertex data arrays.
    // Fill data arrays for Vertex-Positions, Normals, Index data:
    // vertices, normals, indicesLines, indicesTris;
    // Pointer this refers to the window.
    this[geometryname]['createVertexData'].apply(model);
    console.log(model)
    // Setup position vertex buffer object.
    model.vboPos = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, model.vboPos);
    gl.bufferData(gl.ARRAY_BUFFER, model.vertices, gl.STATIC_DRAW);
    // Bind vertex buffer to attribute variable.
    prog.positionAttrib = gl.getAttribLocation(prog, 'aPosition');
    gl.enableVertexAttribArray(prog.positionAttrib);

    // Setup normal vertex buffer object.
    model.vboNormal = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, model.vboNormal);
    gl.bufferData(gl.ARRAY_BUFFER, model.normals, gl.STATIC_DRAW);
    // Bind buffer to attribute variable.
    prog.normalAttrib = gl.getAttribLocation(prog, 'aNormal');
    gl.enableVertexAttribArray(prog.normalAttrib);

    // Setup lines index buffer object.
    model.iboLines = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, model.iboLines);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, model.indicesLines,
        gl.STATIC_DRAW);
    model.iboLines.numberOfElements = model.indicesLines.length;
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, null);

    // Setup triangle index buffer object.
    model.iboTris = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, model.iboTris);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, model.indicesTris,
        gl.STATIC_DRAW);
    model.iboTris.numberOfElements = model.indicesTris.length;
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, null);
  }

  function initEventHandler() {
    var deltaScale = 0.05;

    function animate(sign) {
      //torusM.rotate[0] += sign * deltaRotate;
      torusM.rotate[1] += sign * deltaRotate;
      //torusM.rotate[2] += sign * deltaRotate;
      sphere1.translate

      sphereAngle = (sphereAngle + deltaRotate) % (2 * Math.PI);

      const cosOffset = 1 + (Math.cos(sphereAngle));
      const sinOffset = Math.sin(sphereAngle);

      sphere1.translate[0] = 2 * cosOffset - 2;

      sphere2.translate[0] = 1.3 * (cosOffset - 1);
      sphere2.translate[2] = -1.4 * (sinOffset - 1);

      sphere3.translate[0] = (-cosOffset) + 1.5;
      sphere3.translate[2] = sinOffset;

      sphere4.translate[1] = sinOffset + 0.7;
      sphere4.translate[2] = 1.5 * (cosOffset) - 2.5;
    }

    window.onkeydown = function(evt) {
      // Use shift key to change sign.
      var sign = evt.shiftKey ? -1 : 1;
      var key = evt.which ? evt.which : evt.keyCode;
      var c = String.fromCharCode(key);
      console.log('Getting Key Event')
      console.log(evt);

      // Change projection of scene.
      switch(c) {
        case('O'):
          camera.projectionType = "ortho"; // Turn on the othoganl view mode on, with keytrokes W, S, A, B and D
          camera.lrtb = 2;
          break;
        case('F'):
          camera.projectionType = "frustum"; // Turn on the frustum view mode on, where keytroke B and Shift+B can be used
          break;
        case('P'):
          camera.projectionType = "perspective"; //Turn the perspektiv view mode on, with additional keytroke V and Shift+V, but keystroke B is not working
          break;
        case('W'):
          camera.eye[1] += deltaTranslate; //Move the camera to the top
          break;
        case('S'):
          camera.eye[1] -= deltaTranslate; //Move the camera to the bottom
          break;
        case('A'):
          camera.zAngle += deltaRotate; //Move the camera to the left
          break;
        case('D'):
          camera.zAngle -= deltaRotate; //Move the camera to the right
          break;
        case('C'):
          // Orbit camera.
          camera.zAngle += sign * deltaRotate; //Keystroke C has the same movement of the camera as keystroke A and Shift+C has the same movement of the camera as keystroke D
          break;
        case('Q'):
          camera.distance -= sign * deltaTranslate; //Keystroke Q changes the distance of the camera to the point it looks at
          break;
        case('E'):
          camera.distance += sign * deltaTranslate; //Keystroke E changes the distance of the camera to the point it looks at in the opposite direction to Q
          break;
        case('V'):
          camera.fovy += sign * 5 * Math.PI / 180; //Keystroke V and Shift+V changes the perspective view only in perspective mode (turn on perspective mode with keystroke P)
          break;
        case('B'):
          camera.lrtb += sign * 0.1; //Keystroke B and Shift+B changes the left right top bottom
          break;
        case('L'):
          toggleWireframeOn = !toggleWireframeOn;
          break;
        case('I'):
          moveLightsAroundModels();
          break;
        case('K'):
          animate(sign);
          break;
      }
      render();
    };
  }

  function moveLightsAroundModels() {

    currentLightRotation += deltaRotate;
    illumination.light[0].position[0] = Math.cos(currentLightRotation) * radiusLights;
    illumination.light[0].position[2] = Math.sin(currentLightRotation) * radiusLights;

  }

  function calculateCameraOrbit() {
    // Calculate x,z position/eye of camera orbiting the center.
    var x = 0, z = 2;
    camera.eye[x] = camera.center[x];
    camera.eye[z] = camera.center[z];
    camera.eye[x] += camera.distance * Math.sin(camera.zAngle);
    camera.eye[z] += camera.distance * Math.cos(camera.zAngle);
  }

  function updateTransformations(model) {

    // Use shortcut variables.
    var mMatrix = model.mMatrix;
    var mvMatrix = model.mvMatrix;

    mat4.identity(mMatrix);
    mat4.identity(mvMatrix);

    mat4.translate(mMatrix, mMatrix, model.translate);

    mat4.rotateX(mMatrix, mMatrix, model.rotate[0]);
    mat4.rotateY(mMatrix, mMatrix, model.rotate[1]);
    mat4.rotateZ(mMatrix, mMatrix, model.rotate[2]);

    mat4.scale(mMatrix, mMatrix, model.scale);

    mat4.multiply(mvMatrix, camera.vMatrix, mMatrix);

    // Calculate normal matrix from model-view matrix.
    mat3.normalFromMat4(model.nMatrix, mvMatrix);
  }

  function render() {
    console.log('Rendering ....')
    // Clear framebuffer and depth-/z-buffer.
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    setProjection();

    calculateCameraOrbit();

    // Set view matrix depending on camera.
    mat4.lookAt(camera.vMatrix, camera.eye, camera.center, camera.up);

    // Set light uniforms.
    gl.uniform3fv(prog.ambientLightUniform, illumination.ambientLight);
    // Loop over light sources.
    for (var j = 0; j < illumination.light.length; j++) {
      // bool is transferred as integer.
      gl.uniform1i(prog.lightUniform[j].isOn,
          illumination.light[j].isOn);
      // Tranform light postion in eye coordinates.
      // Copy current light position into a new array.
      var lightPos = [].concat(illumination.light[j].position);
      // Add homogenious coordinate for transformation.
      lightPos.push(1.0);
      vec4.transformMat4(lightPos, lightPos, camera.vMatrix);
      // Remove homogenious coordinate.
      lightPos.pop();
      gl.uniform3fv(prog.lightUniform[j].position, lightPos);
      gl.uniform3fv(prog.lightUniform[j].color,
          illumination.light[j].color);
    }

    // Loop over models.
    for(var i = 0; i < models.length; i++) {
      // Update modelview for model.
      updateTransformations(models[i]);

      // Set uniforms for model.
      gl.uniformMatrix4fv(prog.mvMatrixUniform, false,
          models[i].mvMatrix);

      // Uniform-Variable uColor wird über die Referenz prog.colorUniform mit dem Farbwert aus dem jeweiligen Modell belegt
      gl.uniform4fv(prog.colorUniform, models[i].color);

      // innerhalb des Loops wird über die Modelle die Normal-Matrix Uniform-Variable uNMatrix über die Referenz prog.nMatrixUniform gesetzt
      gl.uniformMatrix3fv(prog.nMatrixUniform, false,
          models[i].nMatrix);


      // Material.
      gl.uniform3fv(prog.materialKaUniform, models[i].material.ka);
      gl.uniform3fv(prog.materialKdUniform, models[i].material.kd);
      gl.uniform3fv(prog.materialKsUniform, models[i].material.ks);
      gl.uniform1f(prog.materialKeUniform, models[i].material.ke);

      draw(models[i]);
    }
  }

  function setProjection() {
    // Set projection Matrix.
    switch(camera.projectionType) {
      case("ortho"): //here the orthogonal view mode ist set up, where the projection matrix is calculated
        var v = camera.lrtb;
        mat4.ortho(camera.pMatrix, -v, v, -v, v, -10, 10);
        break;
      case("frustum"): //here the furstum view mode ist set up, where the projection matrix is calculated
        var v = camera.lrtb;
        mat4.frustum(camera.pMatrix, -v/2, v/2, -v/2, v/2, 1, 10);
        break;
      case("perspective"): //here the perspective view mode ist set up, where the projection matrix is calculated
        mat4.perspective(camera.pMatrix, camera.fovy,
            camera.aspect, 1, 10);
        break;
    }
    // Set projection uniform.
    gl.uniformMatrix4fv(prog.pMatrixUniform, false, camera.pMatrix);
  }

  function draw(model) {
    // Setup position VBO.
    gl.bindBuffer(gl.ARRAY_BUFFER, model.vboPos);
    gl.vertexAttribPointer(prog.positionAttrib, 3, gl.FLOAT, false,
        0, 0);

    // Setup normal VBO.
    gl.bindBuffer(gl.ARRAY_BUFFER, model.vboNormal);
    gl.vertexAttribPointer(prog.normalAttrib, 3, gl.FLOAT, false, 0, 0);

    // Setup rendering tris.
    var fill = (model.fillstyle.search(/fill/) != -1);
    if(fill) {
      gl.enableVertexAttribArray(prog.normalAttrib);
      gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, model.iboTris);
      gl.drawElements(gl.TRIANGLES, model.iboTris.numberOfElements,
          gl.UNSIGNED_SHORT, 0);
    }

    // Setup rendering lines.
    var wireframe = (model.fillstyle.search(/wireframe/) != -1);
    if(wireframe) {
      gl.uniform4fv(prog.colorUniform, [0.,0.,0.,1.]);
      gl.disableVertexAttribArray(prog.normalAttrib);
      gl.vertexAttrib3f(prog.normalAttrib, 0, 0, 0);
      gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, model.iboLines);
      gl.drawElements(gl.LINES, model.iboLines.numberOfElements,
          gl.UNSIGNED_SHORT, 0);

    }
  }

  // App interface.
  return {
    start : start,
    render: render
  }

}());