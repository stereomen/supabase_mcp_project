            // 데이터 분석 및 포맷팅
            for (key in filteredKeys) {
                when (key) {
                    "marine" -> {
                        if (jsonObject.has("marine") && !jsonObject.isNull("marine")) {
                            val marineArray = jsonObject.getJSONArray("marine")
                            formattedText.append("=== 해상 예보 데이터 (${marineArray.length()}개) ===\n\n")
                            
                            for (i in 0 until marineArray.length()) {
                                val marine = marineArray.getJSONObject(i)
                                
                                // 예보 날짜 (tm_ef_kr로 변경)
                                val forecastTime = if (marine.has("tm_ef_kr")) marine.getString("tm_ef_kr") else "N/A"
                                formattedText.append("📅 $forecastTime\n")
                                
                                // 지역 정보
                                if (marine.has("reg_id")) {
                                    formattedText.append("reg_id(지역코드): ${marine.getString("reg_id")}\n")
                                }
                                if (marine.has("reg_sp")) {
                                    formattedText.append("reg_sp(지역구분): ${marine.getString("reg_sp")}\n")
                                }
                                val regName = if (marine.has("reg_name")) marine.getString("reg_name") else "N/A"
                                formattedText.append("reg_name(해역): $regName\n")
                                
                                // 예보 종류 및 모드
                                val forecastType = if (marine.has("forecast_type")) marine.getString("forecast_type") else "N/A"
                                formattedText.append("forecast_type(예보 종류): $forecastType\n")
                                if (marine.has("mod")) {
                                    formattedText.append("mod(모드): ${marine.getString("mod")}\n")
                                }
                                
                                // 예보 시간 정보
                                if (marine.has("tm_fc")) {
                                    formattedText.append("tm_fc(예보시간): ${marine.getString("tm_fc")}\n")
                                }
                                if (marine.has("tm_fc_kr")) {
                                    formattedText.append("tm_fc_kr(예보시간_한국): ${marine.getString("tm_fc_kr")}\n")
                                }
                                if (marine.has("tm_ef")) {
                                    formattedText.append("tm_ef(유효시간): ${marine.getString("tm_ef")}\n")
                                }
                                if (marine.has("tm_ef_kr")) {
                                    formattedText.append("tm_ef_kr(유효시간_한국): ${marine.getString("tm_ef_kr")}\n")
                                }
                                
                                // 하늘상태
                                val sky = if (marine.has("sky")) {
                                    val skyCode = marine.getString("sky")
                                    val skyDesc = getSkyDescription(skyCode)
                                    "$skyCode ($skyDesc)"
                                } else "N/A"
                                formattedText.append("sky(하늘상태): $sky\n")
                                
                                // 강수 정보
                                if (marine.has("pre")) {
                                    formattedText.append("pre(강수): ${marine.getString("pre")}\n")
                                }
                                if (marine.has("rn_st")) {
                                    formattedText.append("rn_st(강수상태): ${marine.getInt("rn_st")}\n")
                                }
                                
                                // 파고 정보 (wh_a, wh_b)
                                val whA = if (marine.has("wh_a") && !marine.isNull("wh_a")) marine.getDouble("wh_a").toString() else "N/A"
                                val whB = if (marine.has("wh_b") && !marine.isNull("wh_b")) marine.getDouble("wh_b").toString() else "N/A"
                                if (whA != "N/A" || whB != "N/A") {
                                    formattedText.append("wh_a~wh_b(파고): ${whA}~${whB}m\n")
                                }
                                
                                // 날씨 예보
                                val wf = if (marine.has("wf") && !marine.isNull("wf")) marine.getString("wf") else "N/A"
                                formattedText.append("wf(날씨예보): $wf\n")
                                
                                // 신뢰도
                                if (marine.has("conf")) {
                                    formattedText.append("conf(신뢰도): ${marine.getString("conf")}\n")
                                }
                                
                                formattedText.append("\n")
                            }
                        }
                    }
                    "marine_observations" -> {
                        if (jsonObject.has("marine_observations") && !jsonObject.isNull("marine_observations")) {
                            val marine = jsonObject.getJSONObject("marine_observations")
                            formattedText.append("=== 해상 관측 데이터 ===\n\n")
                            
                            // A 섹션 (수온, 파고)
                            if (marine.has("a") && !marine.isNull("a")) {
                                val aArray = marine.getJSONArray("a")
                                formattedText.append("🌊 수온 및 파고 관측 (${aArray.length()}개)\n")
                                
                                for (i in 0 until aArray.length()) {
                                    val obs = aArray.getJSONObject(i)
                                    
                                    val obsTime = if (obs.has("observation_time_kst")) obs.getString("observation_time_kst") else "N/A"
                                    formattedText.append("observation_time_kst: $obsTime\n")
                                    
                                    val stationId = if (obs.has("station_id")) obs.getString("station_id") else "N/A"
                                    formattedText.append("station_id(관측소): $stationId\n")
                                    
                                    val waveHeight = if (obs.has("significant_wave_height") && !obs.isNull("significant_wave_height")) {
                                        obs.getDouble("significant_wave_height").toString()
                                    } else "N/A"
                                    formattedText.append("significant_wave_height(파고): ${waveHeight}m\n")
                                    
                                    val waterTemp = if (obs.has("water_temperature") && !obs.isNull("water_temperature")) {
                                        "${obs.getDouble("water_temperature")}°C"
                                    } else "N/A"
                                    formattedText.append("water_temperature(수온): $waterTemp\n")
                                    
                                    formattedText.append("\n")
                                }
                            }