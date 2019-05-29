const request = require('request');
var artist = 'BudkaSuflera'; //domyslna wartosc

if(process.argv[2]){
        artist = process.argv[2];
}

var replaced = artist.replace(/ /g, '');
var url = `https://api.discogs.com/database/search?q=${replaced}&type=artist&key=cPkcpBDMqvoeXINjbDvW&secret=lNXTbHkWuJtyJUQpdqGyGIHHlODZKLSm`;


function filterGroup(group){
        var filteredGroup = {id: group.id, name: group.name};
        return filteredGroup;
}

function memberRequest(id){
        return new Promise(function (resolve, reject){
                request({url: `https://api.discogs.com/artists/${id}`, headers: {'User-Agent':'test/0.1'}}, (err, res, body) => {
                        if(!err && res.statusCode == 200){
                                var arr = JSON.parse(body);
                                var groups = arr.groups;
                                var filteredGroups = groups.map(filterGroup);
                                resolve(filteredGroups);
                        }
                        else{
                                reject(res.statusCode);
                        }
                })
        })
}


request({url, headers: {'User-Agent':'test/0.1'}}, function(error,response,body){
        if(response.statusCode == 200){
                if(JSON.parse(body).results.length == 0){
                        return console.log("Nie znaleziono zespolu, wpisz poprawna nazwe");
                }
                var groupID = JSON.parse(body).results[0].id;
                request({url: `https://api.discogs.com/artists/${groupID}`, headers: {'User-Agent':'test/0.1'}}, async function(error,res,bod){
                        var arr = JSON.parse(bod);
                        var members = arr.members;
                        if(!members){
                            return console.log("Nie znaleziono zespolu")
                        }
                        var groupSet = new Set();
                        for(member of members){
                                try{
                                        var groups = await memberRequest(member.id);
                                        member.groups = groups.map((group) => {
                                            return group.id;
                                        });
                                }catch(e){
                                        console.log(`${e}: Blad w trakcie memberRequest`);
                                        return e;
                                }
                                groups.forEach((group) => {
                                        if(!groupSet.has(JSON.stringify(group))){
                                            groupSet.add(JSON.stringify(group));
                                        }
                                })
                        }

                        var groupArrJSON = Array.from(groupSet);
                        var groupArr = groupArrJSON.map((groupJSON) => {
                            return JSON.parse(groupJSON);
                        })

                        for(group of groupArr){
                            group.members = [];
                            for(member of members){
                                if(member.groups.includes(group.id)){
                                    group.members.push(member);
                                }
                            }
                        }

                        console.log('Inne zespoły, w których grało przynajmniej dwóch członków wyszukiwanego zespołu:')
                        console.log('');
                        for(group of groupArr){
                            if(group.members.length > 1 && group.id != groupID){
                                console.log(`${group.name}:`);
                                for(member of group.members){
                                    console.log(member.name);
                                }
                                console.log('');
                            }
                        }
                });
        }
});
