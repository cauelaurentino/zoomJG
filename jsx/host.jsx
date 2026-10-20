function aplicarZoomDinamico(escalaDigitada) {
    var project = app.project;
    if (!project) return "Erro: Nenhum projeto aberto.";

    var sequence = project.activeSequence;
    if (!sequence) return "Erro: Nenhuma sequência ativa.";

    var selection = sequence.getSelection();
    if (selection.length === 0) return "Erro: Nenhum clipe selecionado na timeline.";

    var clipesAfetados = 0;
    
    // --- INTELIGÊNCIA DO ZOOM ---
    var startScale = 100;
    var endScale = 100;

    // Converte o valor para número garantindo que a matemática funcione
    var valorEscala = parseFloat(escalaDigitada);

    if (valorEscala < 100) {
        // É UM ZOOM OUT (ex: usuário digitou 80)
        // Para não ter borda preta, calculamos a diferença.
        var diferenca = 100 - valorEscala;    // ex: 100 - 80 = 20
        startScale = 100 + diferenca;         // Começa em 120%
        endScale = 100;                       // Termina em 100% (tamanho original)
    } else {
        // É UM ZOOM IN (ex: usuário digitou 150)
        startScale = 100;                     // Começa em 100% (tamanho original)
        endScale = valorEscala;               // Termina com o zoom (150%)
    }

    for (var s = 0; s < selection.length; s++) {
        var clip = selection[s];
        
        // Ignora se for áudio
        if (clip.mediaType !== "Video") {
            continue;
        }

        var components = clip.components;
        var motionComponent = null;
        
        for (var i = 0; i < components.numItems; i++) {
            if (components[i].matchName === "AE.ADBE Motion") {
                motionComponent = components[i];
                break;
            }
        }

        if (motionComponent) {
            // Procura a propriedade em Inglês ou Português
            var scaleProp = motionComponent.properties.getParamForDisplayName("Scale");
            if (!scaleProp) {
                scaleProp = motionComponent.properties.getParamForDisplayName("Escala");
            }
            
            if (scaleProp) {
                scaleProp.setTimeVarying(true); // Liga os keyframes

                var tempoInicio = clip.inPoint.seconds;
                var tempoFim = clip.outPoint.seconds;

                // Keyframe inicial
                scaleProp.addKey(tempoInicio);
                scaleProp.setValueAtKey(tempoInicio, startScale, 1);

                // Keyframe final
                scaleProp.addKey(tempoFim);
                scaleProp.setValueAtKey(tempoFim, endScale, 1);
                
                clipesAfetados++;
            }
        }
    }
    
    if (clipesAfetados > 0) {
        return "Sucesso! Zoom JG aplicado.";
    } else {
        return "Erro: Nenhum clipe de vídeo válido encontrado.";
    }
}

function aplicarZoomIntercalado(escalaIn, escalaOut, tipoInicio) {
    var project = app.project;
    if (!project) return "Erro: Nenhum projeto aberto.";

    var sequence = project.activeSequence;
    if (!sequence) return "Erro: Nenhuma sequência ativa.";

    var selection = sequence.getSelection();
    if (selection.length === 0) return "Erro: Nenhum clipe selecionado na timeline.";

    var clipesAfetados = 0;
    var currentType = tipoInicio; // Guarda se o clipe atual será "in" ou "out"

    // Converte os valores para matemática
    var valIn = parseFloat(escalaIn);
    var valOut = parseFloat(escalaOut);

    for (var s = 0; s < selection.length; s++) {
        var clip = selection[s];
        
        // Ignora áudio, igual fizemos antes
        if (clip.mediaType !== "Video") {
            continue;
        }

        var components = clip.components;
        var motionComponent = null;
        
        for (var i = 0; i < components.numItems; i++) {
            if (components[i].matchName === "AE.ADBE Motion") {
                motionComponent = components[i];
                break;
            }
        }

        if (motionComponent) {
            var scaleProp = motionComponent.properties.getParamForDisplayName("Scale");
            if (!scaleProp) scaleProp = motionComponent.properties.getParamForDisplayName("Escala");
            
            if (scaleProp) {
                scaleProp.setTimeVarying(true); // Liga os keyframes

                var tempoInicio = clip.inPoint.seconds;
                var tempoFim = clip.outPoint.seconds;

                var startScale = 100;
                var endScale = 100;

                // Lógica Inteligente para Intercalar
                if (currentType === "in") {
                    startScale = 100;
                    endScale = valIn;
                } else { // "out"
                    var diferenca = 100 - valOut;
                    startScale = 100 + diferenca;
                    endScale = 100;
                }

                // Aplica os Keyframes
                scaleProp.addKey(tempoInicio);
                scaleProp.setValueAtKey(tempoInicio, startScale, 1);

                scaleProp.addKey(tempoFim);
                scaleProp.setValueAtKey(tempoFim, endScale, 1);
                
                clipesAfetados++;

                // A Mágica: Troca o tipo para o próximo clipe do Loop!
                if (currentType === "in") {
                    currentType = "out";
                } else {
                    currentType = "in";
                }
            }
        }
    }
    
    if (clipesAfetados > 0) {
        return "Sucesso! Zoom Intercalado aplicado em " + clipesAfetados + " clipes.";
    } else {
        return "Erro: Nenhum clipe de vídeo válido encontrado.";
    }
}

function obterEscalaDoClipeSelecionado() {
    try {
        var project = app.project;
        if (!project) return "none";
        
        var sequence = project.activeSequence;
        if (!sequence) return "none";
        
        var selection = sequence.getSelection();
        if (selection.length === 0) return "none"; 
        
        var clip = null;
        for (var s = 0; s < selection.length; s++) {
            if (selection[s].mediaType === "Video") {
                clip = selection[s];
                break;
            }
        }
        
        if (!clip) return "none";

        var clipId = clip.start.ticks; 
        var motionComponent = null;
        
        for (var i = 0; i < clip.components.numItems; i++) {
            if (clip.components[i].matchName === "AE.ADBE Motion") {
                motionComponent = clip.components[i];
                break;
            }
        }

        if (motionComponent) {
            var scaleProp = motionComponent.properties.getParamForDisplayName("Escala");
            if (!scaleProp) scaleProp = motionComponent.properties.getParamForDisplayName("Scale");
            
            if (scaleProp) {
                var valorAExibir = 100;
                var tipo = "CUSTOM"; 

                if (scaleProp.isTimeVarying()) {
                    var keys = scaleProp.getKeys();
                    if (keys && keys.length > 0) {
                        try {
                            var valorInicio = scaleProp.getValueAtKey(keys[0]);
                            var valorFinal = scaleProp.getValueAtKey(keys[keys.length - 1]);
                            
                            if (valorFinal > valorInicio) {
                                // ZOOM IN: O valor de entrada do utilizador é o valor final (ex: 120)
                                tipo = "IN";
                                valorAExibir = valorFinal;
                            } else if (valorFinal < valorInicio) {
                                // ZOOM OUT: Faz a engenharia reversa para descobrir o input original
                                // Se o início é 180, a conta é 200 - 180 = 20.
                                tipo = "OUT";
                                valorAExibir = 200 - valorInicio; 
                            } else {
                                valorAExibir = valorFinal;
                            }
                        } catch(err) {
                            valorAExibir = scaleProp.getValue();
                        }
                    }
                } else {
                    valorAExibir = scaleProp.getValue();
                    if (valorAExibir > 100) tipo = "IN";
                    else if (valorAExibir < 100) tipo = "OUT";
                }

                return clipId + "|" + tipo + "|" + Math.round(valorAExibir);
            }
        }
        return "none";
    } catch(e) {
        return "none";
    }
}