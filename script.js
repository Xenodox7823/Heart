        // --- SCENE SETUP ---
        const scene = new THREE.Scene();
        
        // The default camera position we want to be able to return to
        const defaultCameraPosition = new THREE.Vector3(0, 0, 50);
        const defaultTargetPosition = new THREE.Vector3(0, 0, 0);

        const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
        camera.position.copy(defaultCameraPosition);

        const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
        renderer.setSize(window.innerWidth, window.innerHeight);
        document.body.appendChild(renderer.domElement);

        // --- CAMERA CONTROLS ---
        const controls = new THREE.OrbitControls(camera, renderer.domElement);
        controls.enableDamping = true; 
        controls.dampingFactor = 0.05;
        controls.target.copy(defaultTargetPosition);

        // --- CREATE THE 3D BALLOON SHAPE ---
        const x = 0, y = 0;
        const heartShape = new THREE.Shape();
        heartShape.moveTo(x + 5, y + 5);
        heartShape.bezierCurveTo(x + 5, y + 5, x + 4, y, x, y);
        heartShape.bezierCurveTo(x - 6, y, x - 6, y + 7, x - 6, y + 7);
        heartShape.bezierCurveTo(x - 6, y + 11, x - 3, y + 15.4, x + 5, y + 19);
        heartShape.bezierCurveTo(x + 12, y + 15.4, x + 16, y + 11, x + 16, y + 7);
        heartShape.bezierCurveTo(x + 16, y + 7, x + 16, y, x + 10, y);
        heartShape.bezierCurveTo(x + 7, y, x + 5, y + 5, x + 5, y + 5);

        // We use settings that make the heart "puffy" like a balloon
        const extrudeSettings = {
            depth: 2,           
            bevelEnabled: true, 
            bevelSegments: 20,   // High segments for a smooth surface
            steps: 2,
            bevelSize: 4,        // Pushes the surface outwards
            bevelThickness: 4,   // Pushes the front and back outwards
            curveSegments: 40    
        };

        const baseGeometry = new THREE.ExtrudeGeometry(heartShape, extrudeSettings);
        baseGeometry.center(); // Center the shape

        // Create a temporary mesh to sample points from
        const baseMesh = new THREE.Mesh(baseGeometry, new THREE.MeshBasicMaterial());

        // --- DISTRIBUTE PARTICLES ON THE SURFACE ---
        const sampler = new THREE.MeshSurfaceSampler(baseMesh).build();
        
        const particleCount = 12000; // Total number of particles on the balloon skin
        const particlesGeometry = new THREE.BufferGeometry();
        const particlesPosition = new Float32Array(particleCount * 3);
        
        const tempPosition = new THREE.Vector3();
        for (let i = 0; i < particleCount; i++) {
            sampler.sample(tempPosition);
            // Store the x, y, z coordinates for each sampled point
            particlesPosition[i * 3] = tempPosition.x;
            particlesPosition[i * 3 + 1] = tempPosition.y;
            particlesPosition[i * 3 + 2] = tempPosition.z;
        }
        
        particlesGeometry.setAttribute('position', new THREE.BufferAttribute(particlesPosition, 3));

        // --- PARTICLE TEXTURE (Soft Circle) ---
        function createParticleTexture() {
            const canvas = document.createElement('canvas');
            canvas.width = 32;
            canvas.height = 32;
            const context = canvas.getContext('2d');
            
            const gradient = context.createRadialGradient(16, 16, 0, 16, 16, 16);
            gradient.addColorStop(0, 'rgba(255,255,255,1)');
            gradient.addColorStop(0.4, 'rgba(255,255,255,0.8)');
            gradient.addColorStop(1, 'rgba(255,255,255,0)');
            
            context.fillStyle = gradient;
            context.fillRect(0, 0, 32, 32);
            
            const texture = new THREE.Texture(canvas);
            texture.needsUpdate = true;
            return texture;
        }

        // --- PARTICLE MATERIAL ---
        const particleMaterial = new THREE.PointsMaterial({ 
            size: 0.8,                  // Smaller size prevents "blown out" brightness
            map: createParticleTexture(),   
            transparent: true,          
            opacity: 0.8,               // Slightly transparent
            depthWrite: false,          // Allows seeing through the balloon layers cleanly
            blending: THREE.NormalBlending, // Normal blending prevents colors from turning pure white
            color: 0xff2255 
        });

        const balloonHeart = new THREE.Points(particlesGeometry, particleMaterial);
        
        // Flip right-side up
        balloonHeart.rotation.z = Math.PI; 
        scene.add(balloonHeart);

        // --- BUTTON LOGIC ---
        const resetButton = document.getElementById('reset-camera');
        resetButton.addEventListener('click', () => {
            // Smoothly jumping back to the starting code position
            camera.position.copy(defaultCameraPosition);
            controls.target.copy(defaultTargetPosition);
            controls.update(); // Force the controls to recalculate
        });

        // --- ANIMATION LOOP ---
        let hue = 0;

        function animate() {
            requestAnimationFrame(animate);
            
            // Gently rotate the balloon heart
            balloonHeart.rotation.y += 0.005; 

            // Shift the color gradually (HSL color wheel)
            hue += 0.0015; 
            if (hue > 1) hue = 0; 
            particleMaterial.color.setHSL(hue, 0.9, 0.6); 

            controls.update();
            renderer.render(scene, camera);
        }

        // --- WINDOW RESIZING ---
        window.addEventListener('resize', () => {
            camera.aspect = window.innerWidth / window.innerHeight;
            camera.updateProjectionMatrix();
            renderer.setSize(window.innerWidth, window.innerHeight);
        });

        animate();