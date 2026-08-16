(async function () {
    const USE_LOCAL_GITHUB_FILES = false; 
    const GITHUB_BASE_URL = "./"; 

    const JSON_URL = "QmepLNcj9mCDaTjVvmCM6ocr9xtjvMbWNTmaCSoaYVmqgq";
    
    // Web3-Optimized Media Gateways
    const IPFS_GATEWAYS = [
        'https://nftstorage.link/ipfs/',     // Specifically built for heavy NFT media
        'https://w3s.link/ipfs/',            // Web3.storage high-speed node
        'https://dweb.link/ipfs/',           // Good fallback
        'https://ipfs.io/ipfs/'              // Heavily rate-limited, but reliable last resort
    ];

    const ARTISTS_LIST = [
        "Pradeep Kumar", "Anthony Daasan", "Kalyani Nair", "Susha", "Ghana NB",
        "Vidhya Vijay", "Sujith Sreedhar", "Rakesh", "Manoj Y D", "Pravekha",
        "M S Yeshwanth", "Praveen Sparsh", "Tapass Naresh", "Kanaxx", "Manonmani",
        "Ramana Balachandran", "Padmaja Sreenivasan", "Samanvitha G. Sasidaran", "Sushmita Narasimhan", "Nidhi Saraogi",
        "Sriradha Bharath", "Avantika K", "Fathima Henna", "Pranjal Thakore", "Manoj Krishna",
        "Himanshu Barot", "Manikandan Chembai", "Aditya Ravindran", "Solomon Ravindar", "Karthik Manickavasakam",
        "Naveen Narendranath", "Rithu Vysakh", "Nikhil Ram", "Mylai M Karthikeyan", "Bharath Sankar",
        "Amrit", "Aarvay", "Radar with a K", "Keba Jeremiah", "Shallu Varun",
        "Jhanu", "Metapurse"
    ];

    // THE FAILSAFE: If IPFS is completely blocked, this ensures the UI still builds perfectly.
    const FALLBACK_METADATA = {
        "layout": {
            "layers": [
                { "id": "Strings", "name": "Strings", "states": { "options": [{ "name": "Default String", "uri": "" }] } },
                { "id": "Winds", "name": "Winds", "states": { "options": [{ "name": "Default Wind", "uri": "" }] } },
                { "id": "Ambience", "name": "Ambience", "states": { "options": [{ "name": "Default Ambience", "uri": "" }] } },
                { "id": "Rhythm", "name": "Rhythm", "states": { "options": [{ "name": "Default Rhythm", "uri": "" }] } },
                { "id": "Traditional", "name": "Traditional", "states": { "options": [{ "name": "Default Traditional", "uri": "" }] } },
                { "id": "Voices", "name": "Voices", "states": { "options": [{ "name": "Default Voice", "uri": "" }] } },
                { "id": "Guitars", "name": "Guitars", "states": { "options": [{ "name": "Default Guitar", "uri": "" }] } },
                { "id": "Keys", "name": "Keys", "states": { "options": [{ "name": "Default Keys", "uri": "" }] } },
                { "id": "Electronic", "name": "Electronic", "states": { "options": [{ "name": "Default Electronic", "uri": "" }] } }
            ]
        },
        "audio-layout": {
            "layers": [
                { "id": "Strings", "states": { "options": [{ "uri": "" }] } },
                { "id": "Winds", "states": { "options": [{ "uri": "" }] } },
                { "id": "Ambience", "states": { "options": [{ "uri": "" }] } },
                { "id": "Rhythm", "states": { "options": [{ "uri": "" }] } },
                { "id": "Traditional", "states": { "options": [{ "uri": "" }] } },
                { "id": "Voices", "states": { "options": [{ "uri": "" }] } },
                { "id": "Guitars", "states": { "options": [{ "uri": "" }] } },
                { "id": "Keys", "states": { "options": [{ "uri": "" }] } },
                { "id": "Electronic", "states": { "options": [{ "uri": "" }] } }
            ]
        }
    };

    const state = {
        metadata: null,
        audioPool: {}, 
        visualSlots: {}, 
        selections: { visuals: {}, audio: {} },
        isPlaying: false,
        duration: 0,
        syncInterval: null,
        isSeeking: false
    };

    let animationFrameId = null;

    const UI = {
        gatewayPage: document.getElementById("gateway-page"),
        playerPage: document.getElementById("player-page"),
        enterBtn: document.getElementById("enterBtn"),
        artistsContainer: document.getElementById("artists-container"),
        controls: document.getElementById("controls"),
        activeTags: document.getElementById("active-tags"),
        playPauseBtn: document.getElementById("playPauseBtn"),
        stopBtn: document.getElementById("stopBtn"),
        mixBtn: document.getElementById("mixBtn"),
        iconPlay: document.getElementById("icon-play"),
        iconPause: document.getElementById("icon-pause"),
        progressBar: document.getElementById("progressBar"),
        progressFill: document.getElementById("progress-fill"),
        currentTimeEl: document.getElementById("current-time"),
        totalTimeEl: document.getElementById("total-time"),
        loadingOverlay: document.getElementById("loading-overlay"),
        loadingText: document.getElementById("loading-text"),
        playerBg: document.getElementById("player-bg"),
        layerContainer: document.getElementById("layer-container"),
        learnMoreBtn: document.getElementById("learnMoreBtn"),
        moreText: document.getElementById("moreText")
    };

    function populateArtists() {
        if (!UI.artistsContainer) return;
        UI.artistsContainer.innerHTML = '';
        ARTISTS_LIST.forEach(artist => {
            const tag = document.createElement("span");
            tag.className = "tag";
            tag.textContent = artist;
            UI.artistsContainer.appendChild(tag);
        });
    }

    function formatTime(seconds) {
        if (!seconds || isNaN(seconds)) return "0:00";
        const m = Math.floor(seconds / 60);
        const s = Math.floor(seconds % 60);
        return `${m}:${s.toString().padStart(2, '0')}`;
    }

    function getUrls(cid) {
        if (!cid) return [];
        if (cid.startsWith("http")) return [cid];
        const hash = cid.replace('ipfs://', '');
        if (USE_LOCAL_GITHUB_FILES) return [`${GITHUB_BASE_URL}${hash}`];
        return IPFS_GATEWAYS.map(gw => `${gw}${hash}`);
    }

    function extractRealName(opt, index) {
        if (!opt) return `Option ${index + 1}`;
        if (opt.label) return opt.label;
        if (opt.name) return opt.name;
        if (opt.value) return opt.value;
        if (opt.uri) {
            try {
                let cleanName = opt.uri.split('/').pop().split('.')[0].replace(/[-_]/g, ' ').trim();
                if (cleanName && cleanName.length < 30 && !cleanName.startsWith('Qm')) {
                    return cleanName.replace(/\b\w/g, char => char.toUpperCase());
                }
            } catch (e) {}
        }
        return `Option ${index + 1}`;
    }

    function renderTags() {
        if (!UI.activeTags) return;
        UI.activeTags.innerHTML = '';
        UI.controls.querySelectorAll('.layer-select').forEach(select => {
            const opt = select.options[select.selectedIndex];
            if (opt) {
                const tag = document.createElement("span");
                tag.className = "playing-tag";
                tag.textContent = opt.text;
                UI.activeTags.appendChild(tag);
            }
        });
    }

    async function fetchJSON() {
        for (let i = 0; i < IPFS_GATEWAYS.length; i++) {
            const gateway = IPFS_GATEWAYS[i];
            
            if (UI.loadingText) {
                UI.loadingText.textContent = `Connecting to Node ${i + 1}...`;
            }

            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 4000); 

            try {
                const res = await fetch(`${gateway}${JSON_URL}`, { signal: controller.signal });
                clearTimeout(timeoutId);
                if (res.ok) return await res.json();
            } catch (e) {
                clearTimeout(timeoutId);
                console.warn(`Gateway ${gateway} timed out or failed.`);
            }
        }
        
        throw new Error("All IPFS gateways failed to load metadata.");
    }

    // THE WATERFALL LOADER: Loads audio stems sequentially to avoid 504 timeouts
    async function loadAudioStreams() {
        if (UI.loadingOverlay) UI.loadingOverlay.classList.remove('hidden');
        if (UI.playPauseBtn) UI.playPauseBtn.disabled = true;

        const layerIds = Object.keys(state.selections.audio);
        
        // Load files one by one (Sequential) instead of all at once (Parallel)
        for (let i = 0; i < layerIds.length; i++) {
            const layerId = layerIds[i];
            
            if (UI.loadingText) {
                UI.loadingText.textContent = `Syncing Layer ${i + 1} of ${layerIds.length}: ${layerId}...`;
            }

            await new Promise((resolve) => {
                const cid = state.selections.audio[layerId];
                const audioNode = state.audioPool[layerId]; 
                
                if (!cid || !audioNode) { resolve(null); return; }

                const urls = getUrls(cid);
                if (urls.length === 0) { resolve(null); return; }

                if (audioNode.src && urls.some(u => audioNode.src.includes(u.split('/').pop()))) {
                    resolve({ layerId, audioNode });
                    return;
                }

                audioNode.volume = 0; 
                let attempt = 0;
                let isResolved = false;

                const finish = (val) => {
                    if (isResolved) return;
                    isResolved = true;
                    resolve(val);
                };

                const onCanPlay = () => {
                    if (audioNode.duration > state.duration) state.duration = audioNode.duration;
                    finish({ layerId, audioNode });
                };

                audioNode.addEventListener('canplaythrough', onCanPlay, { once: true });
                audioNode.addEventListener('loadeddata', onCanPlay, { once: true });

                audioNode.addEventListener('error', () => { 
                    attempt++;
                    if (attempt < urls.length) {
                        audioNode.src = urls[attempt];
                        audioNode.load();
                    } else { 
                        finish(null); 
                    }
                }); 
                
                audioNode.src = urls[attempt];
                audioNode.load();

                // 4-SECOND FAILSAFE: Do not permanently lock the UI if audio stems hang
                setTimeout(() => finish(null), 4000);
            });
            
            // Add a tiny 250ms breather between requests so the IPFS node doesn't block us
            await new Promise(r => setTimeout(r, 250)); 
        }

        // --- Post-Loading Sync Logic ---
        let syncTime = 0;
        const currentActiveNodes = Object.values(state.audioPool).filter(n => !n.paused && n.volume > 0);
        if (currentActiveNodes.length > 0) syncTime = currentActiveNodes[0].currentTime;

        Object.keys(state.selections.audio).forEach(layerId => {
            const cid = state.selections.audio[layerId];
            const node = state.audioPool[layerId];
            
            if (cid && node) {
                if (state.isPlaying) {
                    node.currentTime = syncTime;
                    const p = node.play();
                    if (p !== undefined) p.catch(() => {});
                }
            } else if (node) {
                node.pause();
            }
        });

        if (state.isPlaying) {
            enforceSync();
            setTimeout(() => { enforceSync(); }, 200);
            
            Object.keys(state.selections.audio).forEach(layerId => {
                if (state.selections.audio[layerId]) state.audioPool[layerId].volume = 1;
            });
        }

        if (UI.totalTimeEl) UI.totalTimeEl.textContent = formatTime(state.duration);
        if (UI.playPauseBtn) UI.playPauseBtn.disabled = false;
        if (UI.loadingOverlay) UI.loadingOverlay.classList.add('hidden');
    }

    function enforceSync() {
        if (state.isSeeking) return;

        const nodes = Object.values(state.audioPool).filter(n => !n.paused && n.src);
        if (nodes.length <= 1) return;
        
        const master = nodes[0];
        nodes.forEach((node, i) => {
            if (i === 0) return;
            const drift = node.currentTime - master.currentTime;
            
            if (Math.abs(drift) > 0.2) {
                node.currentTime = master.currentTime;
            } else if (Math.abs(drift) > 0.03) {
                node.playbackRate = master.playbackRate - (drift * 0.4); 
            } else {
                node.playbackRate = 1.0;
            }
        });
    }

    function playAudio(targetTime = null) {
        const nodes = Object.values(state.audioPool).filter(n => n.src);
        if (nodes.length === 0) return;

        const timeToSet = targetTime !== null ? targetTime : (nodes[0].currentTime || 0);
        
        nodes.forEach(node => { 
            node.volume = 0;
            node.currentTime = timeToSet; 
            const p = node.play();
            if (p !== undefined) { p.catch(err => console.warn("Browser blocked play", err)); }
        });

        state.isPlaying = true;
        document.body.classList.add('playing'); 
        if (UI.iconPlay) UI.iconPlay.classList.add('hidden');
        if (UI.iconPause) UI.iconPause.classList.remove('hidden');
        renderTags();

        setTimeout(() => {
            enforceSync();
            nodes.forEach(node => { node.volume = 1; });
        }, 250);

        if (state.syncInterval) clearInterval(state.syncInterval);
        state.syncInterval = setInterval(enforceSync, 600); 
        requestAnimationFrame(updateLoop);
    }

    function pauseAudio() {
        Object.values(state.audioPool).forEach(node => node.pause());
        state.isPlaying = false;
        document.body.classList.remove('playing'); 
        if (UI.iconPlay) UI.iconPlay.classList.remove('hidden');
        if (UI.iconPause) UI.iconPause.classList.add('hidden');
        if (state.syncInterval) clearInterval(state.syncInterval);
    }

    function stopAudio() {
        Object.values(state.audioPool).forEach(node => {
            node.pause();
            node.currentTime = 0;
            node.playbackRate = 1.0;
        });
        state.isPlaying = false;
        document.body.classList.remove('playing'); 
        if (UI.iconPlay) UI.iconPlay.classList.remove('hidden');
        if (UI.iconPause) UI.iconPause.classList.add('hidden');
        if (UI.progressFill) UI.progressFill.style.width = '0%';
        if (UI.currentTimeEl) UI.currentTimeEl.textContent = '0:00';
        if (state.syncInterval) clearInterval(state.syncInterval);
        cancelAnimationFrame(animationFrameId);
    }

    async function seekTo(targetTime) {
        if (!state.duration || isNaN(targetTime)) return;

        state.isSeeking = true;
        if (state.syncInterval) clearInterval(state.syncInterval);

        const nodes = Object.values(state.audioPool).filter(n => n.src);
        if (nodes.length === 0) {
            state.isSeeking = false;
            return;
        }

        const percent = (targetTime / state.duration) * 100;
        if (UI.progressFill) UI.progressFill.style.width = `${percent}%`;
        if (UI.currentTimeEl) UI.currentTimeEl.textContent = formatTime(targetTime);

        if (UI.loadingOverlay) UI.loadingOverlay.classList.remove('hidden');
        if (UI.loadingText) UI.loadingText.textContent = "Syncing Layers...";

        nodes.forEach(node => {
            node.pause();
            node.volume = 0;
            node.playbackRate = 1.0; 
        });

        const seekPromises = nodes.map(node => {
            return new Promise(resolve => {
                const onReady = () => {
                    node.removeEventListener('seeked', onReady);
                    node.removeEventListener('canplay', onReady);
                    resolve();
                };
                
                node.addEventListener('seeked', onReady);
                node.addEventListener('canplay', onReady);
                node.currentTime = targetTime;

                setTimeout(resolve, 3000); 
            });
        });

        await Promise.all(seekPromises);

        nodes.forEach(node => {
            node.currentTime = targetTime;
            node.volume = 1; 
        });

        state.isSeeking = false;
        if (UI.loadingOverlay) UI.loadingOverlay.classList.add('hidden');

        if (state.isPlaying) {
            nodes.forEach(node => {
                const p = node.play();
                if (p !== undefined) p.catch(() => {});
            });
            state.syncInterval = setInterval(enforceSync, 600);
        }
    }

    function handleProgressInteraction(e) {
        if (!state.duration) return;
        const rect = UI.progressBar.getBoundingClientRect();
        
        let clientX = e.clientX;
        if (e.touches && e.touches.length > 0) {
            clientX = e.touches[0].clientX;
        } else if (e.changedTouches && e.changedTouches.length > 0) {
            clientX = e.changedTouches[0].clientX;
        }

        if (clientX === undefined || clientX === null) return;

        const percentage = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
        const targetTime = percentage * state.duration;

        seekTo(targetTime);
    }

    function updateLoop() {
        if (!state.isPlaying || state.isSeeking) return;
        const nodes = Object.values(state.audioPool).filter(n => !n.paused && n.src);
        if (nodes.length > 0 && UI.progressFill && UI.currentTimeEl) {
            const current = nodes[0].currentTime;
            UI.progressFill.style.width = `${(current / state.duration) * 100}%`;
            UI.currentTimeEl.textContent = formatTime(current);
        }
        animationFrameId = requestAnimationFrame(updateLoop);
    }

    function updateVisuals(changedLayerId = null) {
        if (!state.metadata) return;
        const visuals = (state.metadata.layout?.layers || []).slice(0, 10);

        visuals.forEach((layer) => {
            const layerId = layer.id;
            if (changedLayerId && changedLayerId !== layerId) return;

            const cid = state.selections.visuals[layerId];
            const slot = state.visualSlots[layerId]; 
            
            if (!slot) return;
            slot.dataset.targetCid = cid;

            if (!cid) {
                slot.innerHTML = '';
                return;
            }

            const urls = getUrls(cid);
            if (urls.length === 0) return;

            const isString = layerId.toLowerCase().includes('string');
            const img = new Image();
            img.className = isString ? 'bg-layer-cover' : 'layerImage';

            let attempt = 0;
            img.onload = () => {
                if (slot.dataset.targetCid !== cid) return;

                const oldImages = Array.from(slot.querySelectorAll('img'));
                
                oldImages.forEach(oldImg => {
                    oldImg.classList.remove('layer-visible');
                    setTimeout(() => { if (oldImg.parentNode) oldImg.remove(); }, 1200);
                });

                slot.appendChild(img);
                
                requestAnimationFrame(() => {
                    img.classList.add('layer-visible');
                });
            };
            img.onerror = () => { attempt++; if (attempt < urls.length) img.src = urls[attempt]; };
            img.src = urls[attempt];
        });
    }

    async function handleChange(layerId, visualCid, audioCid) {
        state.selections.visuals[layerId] = visualCid;
        state.selections.audio[layerId] = audioCid;
        renderTags(); 
        
        updateVisuals(layerId); 
        await loadAudioStreams(); 
    }

    async function init() {
        populateArtists();
        
        if (UI.loadingOverlay) {
            UI.loadingOverlay.classList.remove('hidden');
            if (UI.loadingText) UI.loadingText.textContent = "Booting Gateway & Locating Blueprint...";
        }
        
        try {
            state.metadata = await fetchJSON();
            if (UI.loadingText) UI.loadingText.textContent = "Blueprint Found. Building UI...";
        } catch (e) {
            console.warn("IPFS Fetch Failed. Injecting Offline Fallback UI.", e);
            state.metadata = FALLBACK_METADATA; 
            if (UI.loadingText) UI.loadingText.textContent = "Offline Mode: IPFS Blocked. UI Built from Fallback.";
        }

        try {
            const visuals = (state.metadata.layout?.layers || []).slice(0, 10);
            const audios = (state.metadata["audio-layout"]?.layers || []).slice(0, 10);

            if (UI.controls) UI.controls.innerHTML = '';
            
            visuals.forEach((layer, index) => {
                const layerId = layer.id || `layer_${index}`;
                
                const audio = new Audio();
                audio.crossOrigin = "anonymous";
                audio.loop = true;
                audio.preload = "auto";
                audio.preservesPitch = false;
                state.audioPool[layerId] = audio;

                const slot = document.createElement('div');
                slot.className = 'layer-slot';
                slot.style.zIndex = index + 5; 
                
                const isString = layerId.toLowerCase().includes('string');
                if (isString && UI.playerBg) {
                    UI.playerBg.appendChild(slot);
                } else if (UI.layerContainer) {
                    UI.layerContainer.appendChild(slot);
                }
                state.visualSlots[layerId] = slot;

                if (layer.states?.options?.length > 0) {
                    const audioLayer = audios[index];
                    
                    const div = document.createElement("div");
                    div.className = "dropdown-group";
                    
                    const label = document.createElement("label");
                    label.textContent = layer.name || layerId.replace(/[_-]/g, ' ');
                    
                    const select = document.createElement("select");
                    select.className = "layer-select";
                    select.dataset.layerId = layerId; 
                    
                    layer.states.options.forEach((opt, idx) => {
                        const option = document.createElement("option");
                        const audioCid = audioLayer?.states?.options?.[idx]?.uri || "";
                        option.value = JSON.stringify({ visual: opt.uri, audio: audioCid });
                        option.textContent = extractRealName(opt, idx);
                        select.appendChild(option);
                    });

                    div.appendChild(label);
                    div.appendChild(select);
                    UI.controls.appendChild(div);

                    select.addEventListener("change", (e) => {
                        const data = JSON.parse(e.target.value);
                        handleChange(layerId, data.visual, data.audio);
                    });
                }
            });

            UI.controls.querySelectorAll('.layer-select').forEach(select => {
                select.selectedIndex = 0; 
                const data = JSON.parse(select.value);
                state.selections.visuals[select.dataset.layerId] = data.visual;
                state.selections.audio[select.dataset.layerId] = data.audio;
            });

            renderTags();
            updateVisuals(); 

            setTimeout(() => {
                if (UI.loadingOverlay) UI.loadingOverlay.classList.add('hidden');
            }, 1000);

        } catch (e) {
            console.error("Critical Failure building UI", e);
            if (UI.loadingText) UI.loadingText.textContent = "Critical UI Error. Check Console.";
        }
    }

    if (UI.learnMoreBtn && UI.moreText) {
        UI.learnMoreBtn.addEventListener('click', () => {
            UI.moreText.classList.toggle('hidden');
            UI.learnMoreBtn.textContent = UI.moreText.classList.contains('hidden') ? "Learn more" : "Show less";
        });
    }

    if (UI.enterBtn && UI.gatewayPage && UI.playerPage) {
        UI.enterBtn.addEventListener('click', async () => {
            
            Object.values(state.audioPool).forEach(node => {
                node.volume = 0;
                const p = node.play();
                if (p !== undefined) p.catch(()=>{});
                node.pause();
            });

            UI.gatewayPage.classList.remove('active');
            setTimeout(() => {
                UI.gatewayPage.classList.add('hidden');
                UI.playerPage.classList.remove('hidden');
                setTimeout(() => UI.playerPage.classList.add('active'), 50);
            }, 600);

            await loadAudioStreams();
        });
    }

    if (UI.playPauseBtn) {
        UI.playPauseBtn.addEventListener('click', async () => {
            if (state.isPlaying) pauseAudio();
            else playAudio();
        });
    }

    if (UI.stopBtn) {
        UI.stopBtn.addEventListener('click', () => stopAudio());
    }

    if (UI.mixBtn) {
        UI.mixBtn.addEventListener('click', async () => {
            UI.controls.querySelectorAll('.layer-select').forEach(select => {
                select.selectedIndex = Math.floor(Math.random() * select.options.length);
                const data = JSON.parse(select.value);
                state.selections.visuals[select.dataset.layerId] = data.visual;
                state.selections.audio[select.dataset.layerId] = data.audio;
            });

            renderTags();
            updateVisuals();
            await loadAudioStreams();
        });
    }

    if (UI.progressBar) {
        UI.progressBar.addEventListener('click', handleProgressInteraction);
        UI.progressBar.addEventListener('touchstart', handleProgressInteraction, { passive: true });
    }

    init();
})();
