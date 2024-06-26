import React, { useState } from 'react';
import { Input, Card, Row, Avatar, Col, Space, Typography, Spin } from 'antd';
import axios from 'axios';
import Swal from 'sweetalert2';
import Cookies from 'js-cookie'; // Import js-cookie for cookie management
import { useNavigate } from 'react-router-dom'; // Import useHistory for navigation
import { baseUrl } from '../baseurl'; // Assuming you have a baseUrl file
import Loader from './Loader';

const { Text } = Typography;

const UserInputPage = () => {
    let reme="";
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState([]);
    const [searchType, setSearchType] = useState(null);
    const [loading, setLoading] = useState(false);
    const [source, setSource] = useState(null);
    const navigate = useNavigate(); // Initialize useHistory for navigation

    const handleInputChange = async (e) => {
        const inputValue = e.target.value.toUpperCase();
        setSearchQuery(inputValue);

        if (!inputValue) {
            setSearchResults([]);
            return;
        }

        if (source) {
            source.cancel('Operation canceled due to new input.');
        }

        const cancelToken = axios.CancelToken;
        const newSource = cancelToken.source();
        setSource(newSource);

        determineSearchType(inputValue, newSource);
    };
    const showRememberMePrompt = () => {
        Swal.fire({
          title: 'Remember Me',
          text: 'Would you like us to remember your search query for future visits?',
          icon: 'question',
          showCancelButton: true,
          confirmButtonText: 'Yes',
          cancelButtonText: 'No',
        }).then((result) => {
          if (result.isConfirmed) {
            rememberInput(searchQuery, searchType);
          }
        });
      };
    

    const determineSearchType = async (inputValue, cancelTokenSource) => {
        if (/^\d{10}$/.test(inputValue)) {
            setSearchType('phone');
        } else if (/^\d{1,9}$/.test(inputValue)) {
            setSearchType('partialPhone');
        } else if (/^2[a-zA-Z0-9]+$/.test(inputValue)) {
            setSearchType('hallticketno');
        } else {
            setSearchType('name');
        }
        await fetchResults(inputValue, cancelTokenSource);
    };

    const fetchResults = async (inputValue, cancelTokenSource) => {
        try {
            setLoading(true);
            const response = await axios.post(`${baseUrl}/api/search`, { searchInput: inputValue }, { cancelToken: cancelTokenSource.token });
            setSearchResults(response.data);
        } catch (error) {
            if (axios.isCancel(error)) {
                console.log('Request canceled:', error.message);
            } else {
                console.error('Error fetching search results:', error);
            }
        } finally {
            setLoading(false);
        }
    };

    const handleResultClick = async (result) => {
        const resultText = getResultText(result).trim();
        setSearchQuery(resultText);
    
        const mobileNumber = result.phone;
        if (result.lastname === "Kmit123$" || result.lastname==undefined) {

            try {
                const response = await axios.post(`${baseUrl}/api/def-token`, {
                    mobileNumber: mobileNumber
                });
                if(response.data.success!==1){
                    showPasswordPrompt(mobileNumber);
                }
                else{
                    reme="ok";
                    Cookies.set('token', response.data.token, { expires: 7, sameSite: 'strict' });
                fetchUserInfo(response.data.token);
                }
            } catch (error) {
                console.error('Error logging in:', error);
            }
        }
        else{
            try {
                const response = await axios.post(`${baseUrl}/api/get-token`, {
                    mobileNumber: result.phone,
                    password: result.lastname
                });
                if(response.data.success!==1){
                    showPasswordPrompt(mobileNumber);
                }
                else{
                    reme="ok";
                    Cookies.set('token', response.data.token, { expires: 7, sameSite: 'strict' });
                fetchUserInfo(response.data.token);
                }
                
            } catch (error) {
                console.error('Error logging in:', error);
                
            }
        
        }
        console.log(reme);
        if(reme==="ok"){
            Swal.fire({
                title: 'Remember This?',
                text: 'Do you want to remember this Name/ph.no/rollno for future visits?',
                icon: 'question',
                showCancelButton: true,
                confirmButtonText: 'Yes',
                cancelButtonText: 'No',
              }).then((result1) => {
                if (result1.isConfirmed) {
                  localStorage.setItem('phnumber', result.phone);
                  localStorage.setItem('password', result.lastname);
                }
              });
        }
        
    };

    const showPasswordPrompt = (mobileNumber) => {
        
        Swal.fire({
            title: 'Enter KMIT Netra Password',
            input: 'password',
            inputAttributes: {
                autocapitalize: 'off'
            },
            showCancelButton: true,
            confirmButtonText: 'Submit',
            showLoaderOnConfirm: true,
            preConfirm: async (password) => {
                try {
                    
                    const response = await axios.post(`${baseUrl}/api/get-token`, {
                        mobileNumber: mobileNumber,
                        password: password
                    });

                    return response.data; // Return response data to handle in then
                } catch (error) {
                    console.error('Error logging in:', error);
                    Swal.showValidationMessage(
                        `Login failed: ${error}`
                    );
                }
            },
            allowOutsideClick: () => !Swal.isLoading()
        }).then((result) => {
            if (result.isConfirmed) {
                if (result.value && result.value.token) {
                    Cookies.set('token', result.value.token, { expires: 7, sameSite: 'strict' });
                    reme="ok";
                    console.log("came man");
                    fetchUserInfo(result.value.token);
                } else {
                    Swal.fire({
                        icon: 'error',
                        title: 'Invalid Token',
                        text: 'Failed to retrieve valid token from Netra API.',
                    });
                }
            }
        });
    };
    const fetchUserInfo = async (token) => {
       try {
            const response = await axios.post(`${baseUrl}/api/userinfo`, {}, {
                headers: {
                    Authorization: `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (response.data && response.data.success) {
                const { rollno } = response.data.user;

                // Store rollno in cookies
                Cookies.set('rollno', rollno, { expires: 7, sameSite: 'strict' });

                // Redirect to /user page
                navigate('/user');
            } else {
                Swal.fire({
                    icon: 'error',
                    title: 'Failed to Retrieve User Info',
                    text: 'Could not fetch user information from Netra API.',
                });
            }
        } catch (error) {
            console.error('Error fetching user info:', error);
            Swal.fire({
                icon: 'error',
                title: 'Error',
                text: 'Failed to fetch user information.',
            });
        }
    };

    const getAvatar = (result) => {
        return (
            <Avatar
                style={{ backgroundColor: 'grey', verticalAlign: 'middle' }}
                icon={<Avatar />}
            >
                {getResultText(result).charAt(0)}
            </Avatar>
        );
    };

    const getResultText = (result) => {
        switch (searchType) {
            case 'name':
                return `${result.firstname}`;
            case 'hallticketno':
                return `${result.hallticketno}`;
            case 'phone':
                return `${result.phone}`;
            case 'partialPhone':
                return `${result.phone}`;
            default:
                return '';
        }
    };

    return (
        <div style={{ padding: '2rem', maxWidth: '800px', margin: '0 auto' }}>
            <Row justify="center" style={{ marginBottom: '2rem' }}>
                <Col span={24} style={{ textAlign: 'center' }}>
                    <Text strong style={{ fontSize: '2rem' }}>Welcome to KMIT SPECTRA 2.0</Text>
                </Col>
                <Col span={24} style={{ textAlign: 'center' }}>
                    <Text type="secondary" style={{ fontSize: '1.1rem' }}>Access Your Academic Profile, Attendance, Results....!</Text>
                </Col>
            </Row>
            <Row justify="center">
                <Col span={24}>
                    <Input.Search
                        value={searchQuery}
                        onChange={handleInputChange}
                        placeholder="Enter Name, HallTicket No, or Phone No."
                        enterButton
                        size="large"
                        style={{ width: '100%' }}
                    />
                </Col>
            </Row>
            {loading && (
                <Row justify="center" style={{ marginTop: '2rem' }}>
                    <Col span={24} style={{ textAlign: 'center' }}>
                        <Spin size="large" />
                    </Col>
                </Row>
            )}
            {!loading && searchQuery && (
                <Row justify="center" style={{ marginTop: '2rem' }}>
                    <Col span={24}>
                        <Space direction="vertical" style={{ width: '100%' }}>
                            {searchResults.map((result, index) => (
                                <Card
                                    key={index}
                                    style={{ boxShadow: '0 4px 8px rgba(0, 0, 0, 0.1)', marginBottom: '1rem' }}
                                    onClick={() => handleResultClick(result)}
                                >
                                    <Card.Meta
                                        avatar={getAvatar(result)}
                                        title={<Text strong>{getResultText(result)}</Text>}
                                        description={`CURRENT YEAR: ${result.currentyear}`}
                                    />
                                </Card>
                            ))}
                        </Space>
                    </Col>
                </Row>
            )}
        </div>
    );
};

export default UserInputPage;
