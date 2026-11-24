import * as React from 'react';
import {View,Text,Dimensions,StyleSheet,Image} from 'react-native';
const windowHeight = Dimensions.get('window').height;
const windowWidth = Dimensions.get('window').width;
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function Splash({navigation}){
    setTimeout(()=>{
        navigation.navigate('Tab')
    },2000)
    return(
            <View style={Styles.mainview}>       
            <Image source={require('../assets/farm.png')} style={{width:150,height:150,alignSelf:'center',justifyContent:'center'}}/>
            <Text style={{color:"black",textAlign:'center',fontSize:28,fontWeight:'bold',marginTop:20}}>
                Kissan Seva
            </Text>
        </View>
    )
    
}
// export  default class  Splash extends React.Component{
//    constructor(){
//        super();
//         this.navigateto = ()=>{
//             setTimeout(async ()=>{
//                 let userdata = AsyncStorage.getItem('userdata').then(value=>{
//                     if(value !== null && value !== undefined){
//                         this.props.navigation.navigate('HomeTab',{
//                             email:value
//                         });
//                     }else{
//                         this.props.navigation.navigate('Login');
//                     }
//                 }).catch((err)=>{
//                     console.log(err);
//                        this.props.navigation.navigate('Login');
//                 });
                
            

//             },2000);
//         }
//         this.navigateto();
//     }
  
//     render(){
//         return(
//             <View style={Styles.mainview}>
//                 {/* <Image source={require('../assets/icon.png')} style={{width:200,height:200,alignSelf:'center',justifyContent:'center'}}/> */}
//                 <Text style={{color:"white",textAlign:'center',fontSize:28,fontWeight:'bold',marginTop:10}}>
//                     Bole Toh Pahadi Podcast
//                 </Text>
//             </View>
//         )
//     }
// }
const Styles = StyleSheet.create({
    mainview:{
        height:windowHeight,
        width:windowWidth,
        backgroundColor:'#9CF68D',
        justifyContent:'center'
    }
});